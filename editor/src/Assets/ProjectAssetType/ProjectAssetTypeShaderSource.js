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

	/**
	 * @param  {ConstructorParameters<typeof ProjectAssetType>} args
	 */
	constructor(...args){
		super(...args);

		this.includedUuids = [];
		this.boundOnShaderInvalidated = null;
	}

	static expectedLiveAssetConstructor = ShaderSource;

	async getLiveAssetData(source){
		const {shaderCode, includedUuids} = await editor.webGpuShaderBuilder.buildShader(source);
		this.includedUuids = includedUuids;
		if(!this.boundOnShaderInvalidated){
			this.boundOnShaderInvalidated = this.onShaderInvalidated.bind(this);
			editor.webGpuShaderBuilder.onShaderInvalidated(this.boundOnShaderInvalidated);
		}
		const liveAsset = new ShaderSource(shaderCode);
		return {liveAsset};
	}

	destroyLiveAssetData(liveAsset){
		super.destroyLiveAssetData(liveAsset);
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

	async *getReferencedAssetUuids(){
		const source = await this.projectAsset.readAssetData();
		const {shaderCode, includedUuids} = await editor.webGpuShaderBuilder.buildShader(source);
		for(const uuid of includedUuids){
			yield uuid;
		}
	}
}
