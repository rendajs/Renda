import {ProjectAssetType} from "./ProjectAssetType.js";
import {AssetLoaderTypeWebGpuPipelineConfig, ShaderSource, VertexState, WebGpuPipelineConfig} from "../../../../src/mod.js";

// todo: better types for generics
/**
 * @extends {ProjectAssetType<WebGpuPipelineConfig, null, any>}
 */
export class ProjectAssetTypeWebGpuPipelineConfig extends ProjectAssetType {
	static type = "JJ:webGpuPipelineConfig";
	static typeUuid = "c850b2eb-ab27-4991-b30e-b60d70ff6a2d";
	static newFileName = "New Pipeline Config";

	/** @type {import("../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure} */
	static propertiesAssetContentStructure = {
		vertexShader: {
			type: "droppable",
			guiOpts: {
				supportedAssetTypes: [ShaderSource],
			},
		},
		fragmentShader: {
			type: "droppable",
			guiOpts: {
				supportedAssetTypes: [ShaderSource],
			},
		},
		primitiveTopology: {
			type: "dropdown",
			guiOpts: {
				items: AssetLoaderTypeWebGpuPipelineConfig.primitiveTopologyTypes,
				defaultValue: "triangle-list",
			},
		},
		preloadVertexStates: {
			type: "array",
			guiOpts: {
				arrayType: "droppable",
				arrayGuiOpts: {
					supportedAssetTypes: [VertexState],
				},
			},
		},
	};

	static expectedLiveAssetConstructor = WebGpuPipelineConfig;
	static usedAssetLoaderType = AssetLoaderTypeWebGpuPipelineConfig;

	/**
	 * @override
	 * @param {*} fileData
	 * @returns {Promise<import("./ProjectAssetType.js").LiveAssetData<WebGpuPipelineConfig, null>>}
	 */
	async getLiveAssetData(fileData) {
		/** @type {import("../ProjectAsset.js").ProjectAsset<import("./ProjectAssetTypeShaderSource.js").ProjectAssetTypeShaderSource>?} */
		const fragmentShaderAsset = await this.editorInstance.projectManager.assetManager.getProjectAsset(fileData.fragmentShader);
		/** @type {import("../ProjectAsset.js").ProjectAsset<import("./ProjectAssetTypeShaderSource.js").ProjectAssetTypeShaderSource>?} */
		const vertexShaderAsset = await this.editorInstance.projectManager.assetManager.getProjectAsset(fileData.vertexShader);
		this.listenForUsedLiveAssetChanges(fragmentShaderAsset);
		this.listenForUsedLiveAssetChanges(vertexShaderAsset);
		let vertexShader = null;
		let fragmentShader = null;
		if (vertexShaderAsset) {
			vertexShader = await vertexShaderAsset.getLiveAsset();
		}
		if (fragmentShaderAsset) {
			fragmentShader = await fragmentShaderAsset.getLiveAsset();
		}
		const liveAsset = new WebGpuPipelineConfig({
			vertexShader, fragmentShader,
			primitiveTopology: fileData.primitiveTopology,
		});
		return {liveAsset};
	}
}
