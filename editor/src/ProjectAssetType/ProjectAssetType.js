export default class ProjectAssetType{
	//override this with a array of types that this window content should be used for
	static type = null;

	//override these with a string that gets used as file name and extension
	//when a new project asset of this type is created
	static newFileName = "New Asset";
	static newFileExtension = "json";

	static storeInProjectAsJson = true;

	constructor(){

	}

	//should return either a `new File()`, a DOMString, or an object
	//objects will automatically be saved as json
	static createNewFile(){
		return "";
	}

	async getLiveAsset(){
		return null;
	}
}
