import {ProjectAssetType} from "./ProjectAssetType.js";
import {AssetLoaderTypeClusteredLightsConfig, ClusteredLightsConfig, Vec3} from "../../../../src/mod.js";

// todo: better types for generics
/**
 * @extends {ProjectAssetType<null, null, any>}
 */
export class ProjectAssetTypeClusteredLightsConfig extends ProjectAssetType {
	static type = "renda:clusteredLightsConfig";
	static typeUuid = "13194e5c-01e8-4ecc-b645-86626b9d5e4c";
	static newFileName = "New Clustered Lights Config";

	/** @type {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure} */
	static propertiesAssetContentStructure = {
		clusterCount: {
			type: "vec3",
			guiOpts: {
				min: 1,
				step: 1,
				defaultValue: new Vec3(16, 9, 24),
			},
		},
		maxLightsPerClusterPass: {
			type: "number",
			guiOpts: {
				min: 1,
				step: 1,
				defaultValue: 10,
			},
		},
	};

	static expectedLiveAssetConstructor = ClusteredLightsConfig;
	static usedAssetLoaderType = AssetLoaderTypeClusteredLightsConfig;

	/** @type {import("../../tasks/task/TaskGenerateServices.js").AssetLoaderTypeImportConfig} */
	static assetLoaderTypeImportConfig = {
		identifier: "AssetLoaderTypeClusteredLightsConfig",
	};

	/**
	 * @override
	 * @param {*} fileData
	 * @returns {Promise<*>}
	 */
	async getLiveAssetData(fileData) {
		const liveAsset = new ClusteredLightsConfig(fileData);
		return {liveAsset, editorData: null};
	}
}
