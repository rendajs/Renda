import BinaryComposer from "../../../src/Util/BinaryComposer.js";
import MaterialMapListUi from "./MaterialMapListUi.js";

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
		this.settingsTreeView = this.treeView.addCollapsable("Map Settings");
		this.onValueChangeCbs = new Set();
		this.mapListTreeView = this.treeView.addCollapsable("Map List");
		this.mapListUi = null;
		this.lastSavedCustomData = null;
		this.lastSavedCustomDataDirty = true;
	}

	//overide this with your logic to load saved data in your ui
	async customAssetDataFromLoad(data){}

	//this should return your current data, it will be saved in the MaterialMap asset
	async getCustomAssetDataForSave(){}

	//fire this whenever a user changes something that
	//requires the custom data to be saved
	signalCustomDataChanged(){
		this.lastSavedCustomDataDirty = true;
		this.valueChanged();
	}

	//this should return a list of mappable values, this will be used to render the ui
	//the values will be automatically loaded, saved and exported in assetbundles
	//customData will be whatever you last returned from getCustomAssetDataForSave()
	//this should return an array of objects of the following format:
	//{
	//	name: "value name",
	//	type: Number, //can be Number, Vec2, Vec3, Vec4 or Mat4
	//}
	static async getMappableValues(customData){return []}

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
			//fail silently, you probaly intended to not export anything
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

	async getCustomAssetDataForSaveInternal(){
		if(this.lastSavedCustomDataDirty){
			const customData = await this.getCustomAssetDataForSave();
			this.lastSavedCustomData = customData;
			this.lastSavedCustomDataDirty = false;
		}
		return this.lastSavedCustomData;
	}

	async updateMapListUi(){
		if(this.mapListUi){
			this.mapListUi.destructor();
			this.mapListUi = null;
		}

		this.mapListUi = new MaterialMapListUi({
			items: await this.constructor.getMappableValues(await this.getCustomAssetDataForSaveInternal()),
		});
		this.mapListTreeView.addChild(this.mapListUi.treeView);
		this.mapListUi.onValueChange(_ => {
			this.valueChanged();
		});
	}

	async getMappableValuesForSave(){
		return this.mapListUi?.getValues();
	}

	fillMapListValues(values){
		if(!this.mapListUi) return;
		this.mapListUi.setValues(values);
	}

	static async getMappedValues(customData, mappedValuesData){
		let mappedValues = [];
		const mappableValues = await this.getMappableValues(customData);
		for(const {name, type, defaultValue} of mappableValues){
			const mappedValueData = mappedValuesData?.[name];
			if(mappedValueData?.visible ?? true){
				mappedValues.push({
					name: mappedValueData?.mappedName ?? name,
					defaultValue: mappedValueData?.defaultValue ?? defaultValue,
					type,
				});
			}
		}
		return mappedValues;
	}

	static invalidConfigurationWarning(message){
		console.warn(message+"\nView MaterialMapType.js for more info.");
	}
}
