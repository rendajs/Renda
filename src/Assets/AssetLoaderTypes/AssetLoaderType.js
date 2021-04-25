export default class AssetLoaderType{

	//this should be the same as the uuid used in ProjectAssetType.js
	static typeUuid = null;

	constructor(assetLoader){
		this.assetLoader = assetLoader;
	}

	//this method should parse an ArrayBuffer and return an
	//instance of the desired class such as a Mesh or Texture
	async parseBuffer(buffer){}
}
