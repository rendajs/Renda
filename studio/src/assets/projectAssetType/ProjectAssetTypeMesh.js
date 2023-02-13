import {ProjectAssetType} from "./ProjectAssetType.js";
import {PropertiesAssetContentMesh} from "../../propertiesAssetContent/PropertiesAssetContentMesh.js";
import {BinaryComposer, BinaryDecomposer, Mesh, createUvSphere} from "../../../../src/mod.js";
import {ProjectAssetTypeVertexState} from "./ProjectAssetTypeVertexState.js";

/**
 * @typedef {object} ProjectAssetTypeMeshEditorData
 * @property {import("../../../../src/mod.js").UuidString?} vertexStateUuid
 */

/**
 * @extends {ProjectAssetType<Mesh?, ProjectAssetTypeMeshEditorData?, "binary">}
 */
export class ProjectAssetTypeMesh extends ProjectAssetType {
	static type = "renda:mesh";
	static typeUuid = "f202aae6-673a-497d-806d-c2d4752bb146";
	static newFileName = "New Mesh";
	static newFileExtension = "rmesh";
	static storeInProjectAsJson = false;
	static propertiesAssetContentConstructor = PropertiesAssetContentMesh;

	/**
	 * @param {import("./ProjectAssetType.js").ProjectAssetTypeConstructorParametersAny} args
	 */
	constructor(...args) {
		super(...args);

		this.magicHeader = 0x68734D6A;
	}

	async createNewLiveAssetData() {
		const defaultVertexStateAssetUuid = "ad4146d6-f709-422e-b93e-5beb51e38fe4";
		const vertexStateLiveAsset = await this.assetManager.getLiveAsset(defaultVertexStateAssetUuid, {
			assertAssetType: ProjectAssetTypeVertexState,
		});
		const mesh = createUvSphere({
			vertexState: vertexStateLiveAsset,
		});
		return {
			liveAsset: mesh,
			studioData: {
				vertexStateUuid: defaultVertexStateAssetUuid,
			},
		};
	}

	static expectedLiveAssetConstructor = Mesh;

	/** @type {import("../../tasks/task/TaskGenerateServices.js").AssetLoaderTypeImportConfig} */
	static assetLoaderTypeImportConfig = {
		identifier: "AssetLoaderTypeMesh",
	};

	/**
	 * @override
	 * @param {Blob} blob
	 * @param {import("../liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 * @returns {Promise<import("./ProjectAssetType.js").LiveAssetData<Mesh?, ProjectAssetTypeMeshEditorData?>>}
	 */
	async getLiveAssetData(blob, recursionTracker) {
		// todo: remove all of this and reuse the code in AssetLoaderTypeMesh
		const arrayBuffer = await blob.arrayBuffer();
		const decomposer = new BinaryDecomposer(arrayBuffer);
		if (decomposer.getUint32() != this.magicHeader) return {liveAsset: null, studioData: null};
		if (decomposer.getUint16() != 1) {
			throw new Error("mesh version is too new");
		}
		const mesh = new Mesh();

		const vertexStateUuid = decomposer.getUuid();
		if (!vertexStateUuid) return {liveAsset: null, studioData: null};
		const layoutProjectAsset = await this.assetManager.getProjectAssetFromUuid(vertexStateUuid, {
			assertAssetType: ProjectAssetTypeVertexState,
		});
		if (layoutProjectAsset) {
			mesh.setVertexState(await layoutProjectAsset.getLiveAsset());
			this.listenForUsedLiveAssetChanges(layoutProjectAsset);
		}

		const indexFormat = decomposer.getUint8();
		if (indexFormat != Mesh.IndexFormat.NONE) {
			let indexBufferLength = decomposer.getUint32();
			if (indexFormat == Mesh.IndexFormat.UINT_16) {
				indexBufferLength *= 2;
			} else if (indexFormat == Mesh.IndexFormat.UINT_32) {
				indexBufferLength *= 4;
			}
			const indexBuffer = decomposer.getBuffer(indexBufferLength);
			mesh.setIndexData(indexBuffer);
		}

		mesh.setVertexCount(decomposer.getUint32());
		const bufferCount = decomposer.getUint16();
		for (let i = 0; i < bufferCount; i++) {
			const attributes = [];
			const attributeCount = decomposer.getUint16();
			for (let j = 0; j < attributeCount; j++) {
				const attributeType = decomposer.getUint16();
				const format = decomposer.getUint8();
				const componentCount = decomposer.getUint8();
				const offset = decomposer.getUint32();
				attributes.push({offset, format, componentCount, attributeType});
			}
			const bufferLength = decomposer.getUint32();
			const buffer = decomposer.getBuffer(bufferLength);
			mesh.copyBufferData({
				arrayBuffer: buffer,
				attributes,
			});
		}

		return {
			liveAsset: mesh,
			studioData: {
				vertexStateUuid,
			},
		};
	}

	/**
	 * @param {Mesh} liveAsset
	 * @param {import("../../../../src/mod.js").UuidString?} vertexStateUuid
	 */
	meshToBuffer(liveAsset, vertexStateUuid) {
		const composer = new BinaryComposer();
		composer.appendUint32(this.magicHeader); // magic header: jMsh
		composer.appendUint16(1); // version

		composer.appendUuid(vertexStateUuid);

		if (!liveAsset.indexBuffer) {
			composer.appendUint8(Mesh.IndexFormat.NONE);
		} else {
			composer.appendUint8(liveAsset.indexFormat);
			let vertexCount = liveAsset.indexBuffer.byteLength;
			if (liveAsset.indexFormat == Mesh.IndexFormat.UINT_16) {
				vertexCount /= 2;
			} else if (liveAsset.indexFormat == Mesh.IndexFormat.UINT_32) {
				vertexCount /= 4;
			}
			composer.appendUint32(vertexCount);
			composer.appendBuffer(liveAsset.indexBuffer);
		}

		composer.appendUint32(liveAsset.vertexCount);
		const buffers = Array.from(liveAsset.getBuffers());
		composer.appendUint16(buffers.length);
		for (const buffer of buffers) {
			const attributes = buffer.attributes;
			composer.appendUint16(attributes.length);
			for (const attribute of attributes) {
				composer.appendUint16(attribute.attributeType);
				composer.appendUint8(attribute.format);
				composer.appendUint8(attribute.componentCount);
				composer.appendUint32(attribute.offset);
			}
			const arrayBuffer = buffer.buffer;
			if (!arrayBuffer) {
				composer.appendUint32(0);
			} else {
				composer.appendUint32(arrayBuffer.byteLength);
				composer.appendBuffer(arrayBuffer);
			}
		}
		return composer.getFullBuffer();
	}

	/**
	 * @override
	 * @param {Mesh} liveAsset
	 * @param {ProjectAssetTypeMeshEditorData} studioData
	 * @returns {Promise<ArrayBuffer>}
	 */
	async saveLiveAssetData(liveAsset, studioData) {
		return this.meshToBuffer(liveAsset, studioData?.vertexStateUuid);
	}

	/**
	 * @override
	 * @param {object} assetSettingOverrides
	 * @returns {Promise<ArrayBuffer?>}
	 */
	async createBundledAssetData(assetSettingOverrides = {}) {
		const {liveAsset, studioData} = await this.projectAsset.getLiveAssetData();
		if (!liveAsset) return null;
		let vertexStateUuid = studioData?.vertexStateUuid;
		if (!vertexStateUuid) return null;
		vertexStateUuid = this.assetManager.resolveDefaultAssetLinkUuid(vertexStateUuid);
		return this.meshToBuffer(liveAsset, vertexStateUuid);
	}

	async *getReferencedAssetUuids() {
		const mesh = await this.projectAsset.getLiveAsset();
		if (!mesh) return;
		const uuid = this.assetManager.getAssetUuidFromLiveAsset(mesh.vertexState);
		if (uuid) yield uuid;
	}
}
