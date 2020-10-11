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
		this.onValueChangeCbs = new Set();
	}


	//overide this with your logic to load saved data in your ui
	async loadData(data){}

	//this should return your current data, it will be saved in the MaterialMap asset
	async getData(){}

	onValueChange(cb){
		this.onValueChangeCbs.add(cb);
	}

	valueChanged(){
		for(const cb of this.onValueChangeCbs){
			cb();
		}
	}

	static invalidConfigurationWarning(message){
		console.warn(message+"\nView MaterialMapType.js for more info.");
	}
}
