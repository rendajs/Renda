import BinaryComposer from "../../../src/Util/BinaryComposer.js";

export default class MaterialMapType{

	//name to be used in the editor ui
	//this should be a string
	static uiName = null;

	//This will be used for storing the map type in the MaterialMap asset.
	//This should have the format "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx".
	//You can generate a uuid in the editor browser console using Util.generateUuid()
	static typeUuid = null;

	static allowExportInAssetBundles = false;

	constructor(treeView){
		this.treeView = treeView;
		this.onValueChangeCbs = new Set();
	}

	//overide this with your logic to load saved data in your ui
	async loadData(data){}

	//this should return your current data, it will be saved in the MaterialMap asset
	async getData(){}

	static assetBundleDataStructure = null;
	static assetBundleDataNameIds = null;

	//used to export materialMaps to asset bundles, should return an Object
	//this doesn't need to export mapped items, this will be done automatically
	//make sure assetBundleDataStructure and assetBundleDataNameIds are set
	//these values will be fed into BinaryComposer.objectToBinary()
	static mapDataToAssetBundleData(mapData){}

	//alternatively you can override this for more control
	static mapDataToAssetBundleBinary(mapData){
		const bundleMapData = this.mapDataToAssetBundleData(mapData);
		if(!bundleMapData){
			console.warn("Failed to export material map, no data to export");
			return null;
		}
		if(!this.assetBundleDataStructure){
			console.warn("Failed to export material map, assetBundleDataStructure is not set");
			return null;
		}
		if(!this.assetBundleDataNameIds){
			console.warn("Failed to export material map, assetBundleDataNameIds is not set");
			return null;
		}
		return BinaryComposer.objectToBinary(bundleMapData, {
			structure: this.assetBundleDataStructure,
			nameIds: this.assetBundleDataNameIds
		});
	}

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
