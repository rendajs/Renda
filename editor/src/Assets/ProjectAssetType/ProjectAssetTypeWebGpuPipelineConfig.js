import ProjectAssetType from "./ProjectAssetType.js";
import editor from "../../editorInstance.js";
import {AssetLoaderTypeWebGpuPipelineConfig, ShaderSource, VertexState, WebGpuPipelineConfig} from "../../../../src/index.js";

export default class ProjectAssetTypeWebGpuPipelineConfig extends ProjectAssetType {
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
			defaultValue: "triangle-list",
			guiOpts: {
				items: AssetLoaderTypeWebGpuPipelineConfig.primitiveTopologyTypes,
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

	async getLiveAssetData(fileData) {
		const fragmentShader = await editor.projectManager.assetManager.getProjectAsset(fileData.fragmentShader);
		const vertexShader = await editor.projectManager.assetManager.getProjectAsset(fileData.vertexShader);
		this.listenForUsedLiveAssetChanges(fragmentShader);
		this.listenForUsedLiveAssetChanges(vertexShader);
		const liveAsset = new WebGpuPipelineConfig({
			vertexShader: await vertexShader.getLiveAsset(),
			fragmentShader: await fragmentShader.getLiveAsset(),
			primitiveTopology: fileData.primitiveTopology,
		});
		return {liveAsset};
	}
}
