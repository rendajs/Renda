export default class ProjectAssetType{
	//override this with a DOMStrings that functions as an identifier
	//for this type. This will be stored in various places such as
	//the asset settings file or the wrapped editor meta data and
	//is used to identify the type of assets.
	//This should have the format "namespace:assetType",
	//for example: "JJ:mesh".
	static type = null;

	//This will be used for storing the asset type in asset bundles.
	//This should have the format "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx".
	//You can generate a uuid in the editor browser console using Util.generateUuid()
	static typeUuid = null;


	//this is used to find out what type an asset is when it isn't json
	//if this value is omitted and storeInProjectAsJson is false,
	//`newFileExtension` will be used instead
	static matchExtensions = [];

	//override these with a string that gets used as file name and extension
	//when a new project asset of this type is created
	static newFileName = "New Asset";
	static newFileExtension = "json";

	static storeInProjectAsJson = true;
	static storeInProjectAsText = false;

	//set this to false if you don't want the editor to
	//wrap your provided data in ProjectAsset.writeAssetData()
	//with editor values
	static wrapProjectJsonWithEditorMetaData = true;

	//the properties window will show ui generated from this structure
	//this object will be fed into PropertiesTreeView.generateFromSerializableStructure
	//leave this as null if you don't want to show any ui or if you want to create
	//custom ui using `propertiesAssetContentConstructor`
	static propertiesAssetContentStructure = null;

	//if you want more control over ui rendering in the properties window
	//you can set this to the constructor of an extended PropertiesAssetContent class
	static propertiesAssetContentConstructor = null;

	//fill this with asset settings you want to appear in
	//the properties window
	static assetSettingsStructure = [];

	constructor(projectAsset){
		this.projectAsset = projectAsset;

		this.boundLiveAssetNeedsReplacement = this.liveAssetNeedsReplacement.bind(this);
		this.usedLiveAssets = new Set();
	}

	//should return either a `new File()`, a DOMString, or an object
	//objects will automatically be saved as json
	static createNewFile(){
		return "";
	}

	//This is used to find out if a specific class could be stored as an asset,
	//when dragging assets to a DroppableGui for instance.
	//Set this to the constructor of the type that you expect to return in getLiveAsset()
	//for example, if getLiveAsset() returns a `new Material()`, this value
	//should be set to `Material` (without new)
	//If you don't plan on adding support for loading this asset type at runtime,
	//you can safely ommit this.
	static expectedLiveAssetConstructor = null;

	//if you plan on supporting loading live assets in the editor,
	//return your liveasset instance here
	async getLiveAsset(fileData){
		return null;
	}

	//use this to store a liveasset instance in the project folder
	//the return value will be passed on to ProjectAsset so depending
	//on your configuration you can return a json object, DOMString, or binary data
	async saveLiveAsset(liveAsset){}

	//this gets called when the file is changed on disk by an external program.
	//use this to modify the liveAsset, or call liveAssetNeedsReplacement() to
	//replace the liveAsset with a new instance entirely.
	async fileChangedExternally(){}

	liveAssetNeedsReplacement(){
		this.projectAsset.liveAssetNeedsReplacement();
	}

	//you can use this to automacally listen for changes in other projectAsset.
	//If any of the registered liveAssets get replaced, the liveAsset
	//of this ProjectAsset automatically gets destroyed and recreated.
	listenForUsedLiveAssetChanges(projectAsset){
		this.usedLiveAssets.add(projectAsset);
		projectAsset.onNewLiveAssetInstance(this.boundLiveAssetNeedsReplacement);
	}

	//optionally override this for custom asset destruction
	destroyLiveAsset(liveAsset){
		liveAsset.destructor?.();
		for(const projectAsset of this.usedLiveAssets){
			projectAsset.removeOnNewLiveAssetInstance(this.boundLiveAssetNeedsReplacement)
		}
	}

	//if this asset is a file that can be opened, open it
	//either in the editor or in an external application
	async open(){}

	//This method is called when creating asset bundles
	//it should return a BufferSource, Blob or USVString. You can use this.projectAsset
	//to generate the binary data. assetSettingOverrides are
	//changes made to the asset settings from the assetbundle
	//that is being generated.
	//If this function returns null or undefined, the raw
	//asset data as it is stored in the project will be used
	//which could be very inefficient.
	async createBundledAssetData(assetSettingOverrides = {}){}

	static invalidConfigurationWarning(message){
		console.warn(message+"\nView ProjectAssetType.js for more info.");
	}
}
