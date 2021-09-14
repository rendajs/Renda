import ProjectAssetType from "./ProjectAssetType.js";
import {Vec3, ClusteredLightsConfig, AssetLoaderTypeClusteredLightsConfig} from "../../../../src/index.js";

export default class ProjectAssetTypeClusteredLightsConfig extends ProjectAssetType{

	static type = "JJ:clusteredLightsSetup";
	static typeUuid = "13194e5c-01e8-4ecc-b645-86626b9d5e4c";
	static newFileName = "New Clustered Lights Config";

	/** @type {import("../../UI/PropertiesTreeView/PropertiesTreeView.js").PropertiesTreeViewStructure} */
	static propertiesAssetContentStructure = {
		clusterCount: {
			type: Vec3,
			defaultValue: new Vec3(16,9,24),
			/** @type {import("../../UI/VectorGui.js").VectorGuiOptions} */
			guiOpts: {
				min: 1,
				step: 1,
			},
		},
		maxLightsPerClusterPass: {
			defaultValue: 10,
			/** @type {import("../../UI/VectorGui.js").VectorGuiOptions} */
			guiOpts: {
				min: 1,
				step: 1,
			},
		},
	};

	static expectedLiveAssetConstructor = ClusteredLightsConfig;
	static usedAssetLoaderType = AssetLoaderTypeClusteredLightsConfig;

	/**
	 * @override
	 * @param {*} fileData
	 * @returns
	 */
	async getLiveAssetData(fileData){
		const liveAsset = new ClusteredLightsConfig(fileData);
		return {liveAsset, editorData: null};
	}
}
