import {AssetLoaderType} from "./AssetLoaderType.js";
import {Mesh} from "../../Core/Mesh.js";
import BinaryDecomposer from "../../util/BinaryDecomposer.js";

export class AssetLoaderTypeMesh extends AssetLoaderType {
	static get typeUuid() {
		return "f202aae6-673a-497d-806d-c2d4752bb146";
	}

	/**
	 * @param  {ConstructorParameters<typeof AssetLoaderType>} args
	 */
	constructor(...args) {
		super(...args);

		this.magicHeader = 0x68734D6A;
	}

	async parseBuffer(arrayBuffer) {
		const decomposer = new BinaryDecomposer(arrayBuffer);
		if (decomposer.getUint32() != this.magicHeader) return null;
		if (decomposer.getUint16() != 1) {
			throw new Error("mesh version is too new");
		}
		const mesh = new Mesh();

		const vertexStateUuid = decomposer.getUuid();
		const vertexState = await this.assetLoader.getAsset(vertexStateUuid);
		mesh.setVertexState(vertexState);

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
			mesh.setBufferData({
				arrayBuffer: buffer,
				attributes,
			});
		}
		return mesh;
	}
}
