export default class ProjectAssetType{
	//override this with a DOMStrings that functions as an identifier
	//for this type. This will be stored in various places such as
	//the asset settings file or the wrapped editor meta data and
	//is used to identify the type of assets.
	static type = null;

	//override these with a string that gets used as file name and extension
	//when a new project asset of this type is created
	static newFileName = "New Asset";
	static newFileExtension = "json";

	static storeInProjectAsJson = true;

	//set this to false if you don't want the editor to
	//wrap your provided data in ProjectAsset.writeAssetData()
	//with editor values
	static wrapProjectJsonWithEditorMetaData = true;

	//which properties asset content class to use for the properties UI
	//leave it as null if you don't wish to show any asset content UI
	static propertiesAssetContentConstructor = null;

	//fill this with asset settings you want to appear in
	//the properties window
	static assetSettingsStructure = [];

	constructor(projectAsset){
		this.projectAsset = projectAsset;
	}

	//should return either a `new File()`, a DOMString, or an object
	//objects will automatically be saved as json
	static createNewFile(){
		return "";
	}

	async getLiveAsset(){
		return null;
	}

	//if this asset is a file that can be opened, open it
	//either in the editor or in an external application
	async open(){

	}
}
