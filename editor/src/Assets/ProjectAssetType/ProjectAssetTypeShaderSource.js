import ProjectAssetType from "./ProjectAssetType.js";
import {ShaderSource} from "../../../../src/index.js";
import {getNameAndExtension} from "../../Util/FileSystems/PathUtil.js";
import editor from "../../editorInstance.js";

export default class ProjectAssetTypeShaderSource extends ProjectAssetType{

	static type = "JJ:shaderSource";
	static typeUuid = "e7253ad6-8459-431f-ac16-609150538a24";
	static newFileName = "New Shader";
	static newFileExtension = "shader";
	static storeInProjectAsJson = false;
	static storeInProjectAsText = true;
	static matchExtensions = ["glsl", "wgsl"];

	constructor(){
		super(...arguments);
	}

	static createNewFile(){
		return `void main(){

}`;
	}

	static expectedLiveAssetConstructor = ShaderSource;

	async getLiveAsset(source){
		return new ShaderSource(source);
	}

	async fileChangedExternally(){
		this.liveAssetNeedsReplacement();
	}
}
