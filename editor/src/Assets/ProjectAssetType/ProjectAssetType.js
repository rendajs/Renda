export default class ProjectAssetType{
	//override this with a array of types that this window content should be used for
	static type = null;

	//override these with a string that gets used as file name and extension
	//when a new project asset of this type is created
	static newFileName = "New Asset";
	static newFileExtension = "json";

	static storeInProjectAsJson = true;

	constructor(projectAsset){
		this.projectAsset = projectAsset;
	}

	//should return either a `new File()`, a DOMString, or an object
	//objects will automatically be saved as json
	static createNewFile(){
		return "";
	}

	//return the constructor of the would-be live asset
	//this is used when the editor only needs to know the asset type
	//this way a live asset is not created when not necessary
	getLiveAssetConstructor(){
		return null;
	}

	async getLiveAsset(){
		return null;
	}

	//if this asset is a file that can be opened, open it
	//either in the editor or in an external application
	async open(){

	}
}
