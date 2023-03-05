import {parseGltf} from "../../../../src/util/gltf/gltfParsing.js";
import {getNameAndExtension} from "../../util/fileSystems/pathUtil.js";
import {ProjectAssetTypeMaterialMap} from "./ProjectAssetTypeMaterialMap.js";
import {ProjectAssetTypeMaterial} from "./ProjectAssetTypeMaterial.js";
import {ProjectAssetType} from "./ProjectAssetType.js";
import {ProjectAssetTypeSampler} from "./ProjectAssetTypeSampler.js";

/**
 * @extends {ProjectAssetType<import("../../../../src/core/Entity.js").Entity?, null, "binary">}
 */
export class ProjectAssetTypeGltf extends ProjectAssetType {
	static type = "renda:gltf";
	static typeUuid = "5d946212-d6f8-412a-8bf1-ee7f4811f038";
	static matchExtensions = ["gltf", "glb"];
	static storeInProjectAsJson = false;
	static storeInProjectAsText = false;

	/**
	 * @override
	 * @param {import("../../windowManagement/WindowManager.js").WindowManager} windowManager
	 */
	async open(windowManager) {
		const entityEditor = windowManager.getMostSuitableContentWindow("renda:entityEditor");
		if (entityEditor) {
			await entityEditor.loadEntityAsset(this.projectAsset.uuid);
		}
	}

	/**
	 * @override
	 * @param {Blob?} blob
	 */
	async getLiveAssetData(blob) {
		if (!blob) {
			return {
				liveAsset: null,
				studioData: null,
			};
		}
		const arrayBuffer = await blob.arrayBuffer();
		const defaultMaterial = await this.assetManager.getLiveAsset("542fb96a-d3f8-4150-9963-9f1bf803da67", {
			assertAssetType: ProjectAssetTypeMaterial,
		});
		const defaultMaterialMap = await this.assetManager.getLiveAsset("873ade41-8986-4371-b2a3-5bc1aff9d938", {
			assertAssetType: ProjectAssetTypeMaterialMap,
		});
		const defaultSampler = await this.assetManager.getLiveAsset("27a0c1fb-2187-4e11-82c7-a944ff43ec47", {
			assertAssetType: ProjectAssetTypeSampler,
		});
		const fileName = this.projectAsset.path.at(-1);
		if (!fileName) {
			throw new Error("Assertion failed, asset has no file name");
		}
		const {extension} = getNameAndExtension(fileName);
		if (extension != "glb" && extension != "gltf") {
			throw new Error("Assertion failed, file extension is not glb or gltf");
		}
		const {entity} = await parseGltf(arrayBuffer, {
			defaultMaterial,
			defaultMaterialMap,
			defaultSampler,
			fileExtension: extension,
		});
		return {
			liveAsset: entity,
			studioData: null,
		};
	}
}
