import ProjectAssetType from "./ProjectAssetType.js";
import {getNameAndExtension} from "../../Util/FileSystems/PathUtil.js";
import editor from "../../editorInstance.js";
import {ShaderSource, WebGpuPipelineConfiguration} from "../../../../src/index.js";

export default class ProjectAssetTypeWebGpuPipelineConfiguration extends ProjectAssetType{

	static type = "JJ:webGpuPipelineConfiguration";
	static typeUuid = "c850b2eb-ab27-4991-b30e-b60d70ff6a2d";
	static newFileName = "New Shader Configuration";

	constructor(){
		super(...arguments);
	}

	static createNewFile(){
		return {};
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
	};

	static expectedLiveAssetConstructor = WebGpuPipelineConfiguration;

	async getLiveAsset(){
		return new WebGpuPipelineConfiguration();
	}

	async fileChangedExternally(){
		this.liveAssetNeedsReplacement();
	}
}
