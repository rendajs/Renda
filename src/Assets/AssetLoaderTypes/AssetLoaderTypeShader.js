import AssetLoaderType from "./AssetLoaderType.js";
import ShaderSource from "../../Rendering/ShaderSource.js";

export default class AssetLoaderTypeShader extends AssetLoaderType{

	static typeUuid = "e7253ad6-8459-431f-ac16-609150538a24";

	constructor(){
		super(...arguments);

		this.builder = null;
		this.boundOnShaderUuidRequested = this.onShaderUuidRequested.bind(this);
	}

	async parseBuffer(buffer, {
		raw = false,
	} = {}){
		const decoder = new TextDecoder();
		const shaderCode = decoder.decode(buffer);
		if(this.builder && !raw){
			const {} = await this.builder.buildShader(shaderCode);
			return new ShaderSource(shaderCode);
		}else{
			return shaderCode;
		}
	}

	setBuilder(builder){
		if(this.builder){
			//todo: also remove this in the destructor of AssetLoaderTypeShader
			this.builder.removeOnShaderUuidRequested(this.boundOnShaderUuidRequested);
		}
		this.builder = builder;
		this.builder.onShaderUuidRequested(this.boundOnShaderUuidRequested);
	}

	async onShaderUuidRequested(uuid){
		const shader = await this.assetLoader.getAsset(uuid, {raw: true});
		return shader;
	}
}
