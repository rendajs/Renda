import AssetLoaderType from "./AssetLoaderType.js";

export default class AssetLoaderTypeMaterial extends AssetLoaderType{

	static typeUuid = "430f47a8-82cc-4b4c-a664-2360794e80d6";

	constructor(){
		super();
	}

	parseBuffer(buffer){
		console.log(buffer);
	}
}
