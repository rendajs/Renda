export default class ProjectAssetType{
	//override this with a DOMStrings that functions as an identifier
	//for this type. This will be stored in various places such as
	//the asset settings file or the wrapped editor meta data and
	//is used to identify the type of assets.
	//This should have the format "namespace:assetType",
	//for example: "JJ:mesh".
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
	async open(){}

	//This method is called when creating asset bundles
	//it should return a BufferSource, Blob or USVString. You can use this.projectasset
	//to generate the binary data. assetSettingOverrides are
	//changes made to the asset settings from the assetbundle
	//that is being generated.
	//If this function returns null or undefined, the raw
	//asset data as it is stored in the project will be used
	//which could be very inefficient.
	async createBundledAssetData(assetSettingOverrides = {}){}
}
