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

		this.includedUuids = [];
		this.boundOnShaderInvalidated = null;
	}

	static createNewFile(){
		return `void main(){

}`;
	}

	static expectedLiveAssetConstructor = ShaderSource;

	async getLiveAsset(source){
		const {shaderCode, includedUuids} = await editor.webGpuShaderBuilder.buildShader(source);
		this.includedUuids = includedUuids;
		if(!this.boundOnShaderInvalidated){
			this.boundOnShaderInvalidated = this.onShaderInvalidated.bind(this);
			editor.webGpuShaderBuilder.onShaderInvalidated(this.boundOnShaderInvalidated);
		}
		return new ShaderSource(shaderCode);
	}

	destroyLiveAsset(liveAsset){
		super.destroyLiveAsset(liveAsset);
		if(this.boundOnShaderInvalidated){
			editor.webGpuShaderBuilder.removeShaderInvalidated(this.boundOnShaderInvalidated);
			this.boundOnShaderInvalidated = null;
		}
	}

	onShaderInvalidated(uuid){
		if(this.includedUuids.includes(uuid)){
			this.liveAssetNeedsReplacement();
		}
	}

	async fileChangedExternally(){
		this.liveAssetNeedsReplacement();
	}
}
