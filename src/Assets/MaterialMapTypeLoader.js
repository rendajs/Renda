export default class MaterialMapTypeLoader{

	//this should be the same uuid as the typeUuid of your MaterialMapType
	static typeUuid = null;

	constructor(assetLoader, materialLoader){
		this.assetLoader = assetLoader;
		this.materialLoader = materialLoader;
	}

	async parseBuffer(buffer){}

	static invalidConfigurationWarning(message){
		console.warn(message+"\nView MaterialMapTypeLoader.js for more info.");
	}
}
