import ProjectAssetType from "./ProjectAssetType.js";
import {WebGpuShaderConfiguration} from "../../../../src/index.js";
import {getNameAndExtension} from "../../Util/FileSystems/PathUtil.js";
import PropertiesAssetContentWebGpuShaderConfiguration from "../../PropertiesAssetContent/PropertiesAssetContentWebGpuShaderConfiguration.js";
import editor from "../../editorInstance.js";

export default class ProjectAssetTypeWebGpuShaderConfiguration extends ProjectAssetType{

	static type = "JJ:webGpuShaderConfiguration";
	static typeUuid = "c850b2eb-ab27-4991-b30e-b60d70ff6a2d";
	static newFileName = "New Shader Configuration";
	static propertiesAssetContentConstructor = PropertiesAssetContentWebGpuShaderConfiguration;

	constructor(){
		super(...arguments);
	}

	static createNewFile(){
		return {};
	}

	static expectedLiveAssetConstructor = WebGpuShaderConfiguration;

	async getLiveAsset(){
		return new WebGpuShaderConfiguration();
	}

	async fileChangedExternally(){
		this.liveAssetNeedsReplacement();
	}
}
