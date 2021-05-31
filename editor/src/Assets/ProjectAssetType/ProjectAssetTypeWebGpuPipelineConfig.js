import ProjectAssetType from "./ProjectAssetType.js";
import editor from "../../editorInstance.js";
import {ShaderSource, WebGpuPipelineConfig, VertexState, AssetLoaderTypeWebGpuPipelineConfig} from "../../../../src/index.js";

export default class ProjectAssetTypeWebGpuPipelineConfig extends ProjectAssetType{

	static type = "JJ:webGpuPipelineConfig";
	static typeUuid = "c850b2eb-ab27-4991-b30e-b60d70ff6a2d";
	static newFileName = "New Pipeline Config";

	constructor(){
		super(...arguments);
	}

	static propertiesAssetContentStructure = {
		vertexShader: {
			type: ShaderSource,
			guiOpts: {
				storageType: "uuid",
			},
		},
		fragmentShader: {
			type: ShaderSource,
			guiOpts: {
				storageType: "uuid",
			},
		},
		primitiveTopology: {
			type: AssetLoaderTypeWebGpuPipelineConfig.primitiveTopologyTypes,
			defaultValue: "triangle-list",
		},
		preloadVertexStates: {
			type: Array,
			arrayOpts: {
				type: VertexState,
				guiOpts: {
					storageType: "uuid",
				},
			},
		},
	};

	static expectedLiveAssetConstructor = WebGpuPipelineConfig;

	async getLiveAssetData(fileData){
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

	async fileChangedExternally(){
		this.liveAssetNeedsReplacement();
	}

	static usedAssetLoaderType = AssetLoaderTypeWebGpuPipelineConfig;
}
