export default class MaterialMapType{

	//name to be used in the editor ui
	//this should be a string
	static uiName = null;

	//This will be used for storing the map type in the MaterialMap asset.
	//This should have the format "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx".
	//You can generate a uuid in the editor browser console using Util.generateUuid()
	static typeUuid = null;

	constructor(treeView){
		this.treeView = treeView;
	}


	//overide this with your logic to load saved data in your ui
	async loadData(data){}

	static invalidConfigurationWarning(message){
		console.warn(message+"\nView MaterialMapType.js for more info.");
	}
}
