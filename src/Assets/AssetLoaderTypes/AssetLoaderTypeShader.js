import AssetLoaderType from "./AssetLoaderType.js";

export default class AssetLoaderTypeShader extends AssetLoaderType{

	static typeUuid = "e7253ad6-8459-431f-ac16-609150538a24";

	constructor(){
		super();
	}

	parseBuffer(buffer){
		const decoder = new TextDecoder();
		return decoder.decode(buffer);
	}
}
