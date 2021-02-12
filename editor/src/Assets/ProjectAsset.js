import editor from "../editorInstance.js";
import {SingleInstancePromise} from "../../../src/index.js";
import {getNameAndExtension} from "../Util/FileSystems/PathUtil.js";

export default class ProjectAsset{
	constructor({
		uuid = null,
		path = [],
		assetSettings = {},
		assetType = null,
		forceAssetType = false,
		isBuiltIn = false,
	} = {}){
		this.uuid = uuid;
		this.path = path;
		this.assetSettings = assetSettings;
		this.assetType = assetType;
		this.forceAssetType = forceAssetType;
		this.needsConsistentUuid = false;
		this.isBuiltIn = isBuiltIn;

		this._projectAssetType = null;
		this.isGettingLiveAsset = false;
		this.currentGettingLiveAssetSymbol = null;
		this.onLiveAssetGetCbs = new Set();
		this.liveAsset = null;

		this.initInstance = new SingleInstancePromise(async _=> await this.init());
		this.initInstance.run();

		this.onNewLiveAssetInstanceCbs = new Set();
	}

	async init(){
		if(!this.assetType){
			if(this.isBuiltIn){
				this.assetType = await ProjectAsset.guessAssetTypeFromPath(this.path);
			}else{
				this.assetType = await ProjectAsset.guessAssetTypeFromFile(this.path);
			}
		}

		const AssetTypeConstructor = editor.projectAssetTypeManager.getAssetType(this.assetType);
		if(AssetTypeConstructor){
			this._projectAssetType = new AssetTypeConstructor(this);
		}
	}

	async waitForInit(){
		await this.initInstance.run();
	}

	async getProjectAssetType(){
		await this.waitForInit();
		return this._projectAssetType;
	}

	static async fromJsonData(uuid, assetData){
		if(!assetData.assetType){
			assetData.assetType = this.guessAssetTypeFromPath(assetData.path);
			assetData.forceAssetType = false;
		};
		const projectAsset = new ProjectAsset({uuid,...assetData});
		return projectAsset;
	}

	static guessAssetTypeFromPath(path = []){
		if(!path || path.length <= 0) return null;
		const fileName = path[path.length - 1];
		const {extension} = getNameAndExtension(fileName);
		if(extension == "json") return null;
		for(const assetType of editor.projectAssetTypeManager.getAssetTypesForExtension(extension)){
			return assetType.type;
		}
		return null;
	}

	static async guessAssetTypeFromFile(path = []){
		const assetType = this.guessAssetTypeFromPath(path);
		if(assetType) return assetType;

		const json = await editor.projectManager.currentProjectFileSystem.readJson(path);
		return json?.assetType || null;
	}

	get name(){
		return this.path[this.path.length - 1];
	}

	//call AssetManager.makeAssetUuidConsistent() to also save
	//the uuid to asset settings file immediately
	makeUuidConsistent(){
		this.needsConsistentUuid = true;
	}

	get needsAssetSettingsSave(){
		if(this.forceAssetType) return true;
		if(this.needsConsistentUuid) return true;

		return false;
	}

	makeBuiltIn(){
		this.isBuiltIn = true;
	}

	assetMoved(newPath){
		this.path = newPath;
	}

	toJson(){
		const assetData = {
			path: this.path,
		}
		if(this.forceAssetType){
			assetData.assetType = this.assetType;
		}
		if(Object.keys(this.assetSettings).length > 0){
			assetData.assetSettings = this.assetSettings;
		}
		return assetData;
	}

	async open(){
		await this.waitForInit();
		await this._projectAssetType.open();
	}

	async createNewLiveAsset(){
		await this.waitForInit();
		const liveAsset = await this._projectAssetType.createNewLiveAsset();
		const assetData = await this._projectAssetType.saveLiveAsset(liveAsset);
		await this.writeAssetData(assetData);
	}

	async getLiveAsset(){
		if(this.liveAsset) return this.liveAsset;

		if(this.isGettingLiveAsset){
			return await new Promise(r => this.onLiveAssetGetCbs.add(r));
		}

		this.isGettingLiveAsset = true;
		const getLiveAssetSymbol = Symbol("get liveAsset");
		this.currentGettingLiveAssetSymbol = getLiveAssetSymbol;
		await this.waitForInit();
		let fileData = null;
		let readFailed = false;
		try{
			fileData = await this.readAssetData();
		}catch(e){
			//todo: implement a way to detect if the file has been deleted
			//and if that's the case give the user an option to remove the uuid
			//from assetSettings.json
			readFailed = true;
		}

		//if destroyLiveAsset has been called before this Promise was finished
		if(getLiveAssetSymbol != this.currentGettingLiveAssetSymbol) return null;

		if(readFailed){
			console.warn("error getting live asset for "+this.path.join("/"));
			this.fireOnLiveAssetGetCbs(null);
			return null;
		}

		const liveAsset = await this._projectAssetType.getLiveAsset(fileData);

		//if destroyLiveAsset has been called before this Promise was finished
		if(getLiveAssetSymbol != this.currentGettingLiveAssetSymbol) return null;

		this.liveAsset = liveAsset;
		this.fireOnLiveAssetGetCbs(this.liveAsset);
		return this.liveAsset;
	}

	//returns the currently loaded live asset synchronously
	//returns null if the liveAsset isn't init yet
	getLiveAssetImmediate(){
		return this.liveAsset;
	}

	onNewLiveAssetInstance(cb){
		this.onNewLiveAssetInstanceCbs.add(cb);
	}

	removeOnNewLiveAssetInstance(cb){
		this.onNewLiveAssetInstanceCbs.delete(cb);
	}

	liveAssetNeedsReplacement(){
		this.destroyLiveAsset();
		for(const cb of this.onNewLiveAssetInstanceCbs){
			cb();
		}
	}

	fireOnLiveAssetGetCbs(liveAsset){
		for(const cb of this.onLiveAssetGetCbs){
			cb(liveAsset);
		}
		this.onLiveAssetGetCbs.clear();
		this.isGettingLiveAsset = false;
	}

	destroyLiveAsset(){
		if(this.isGettingLiveAsset){
			this.fireOnLiveAssetGetCbs(null);
			this.currentGettingLiveAssetSymbol = null;
		}else if(this.liveAsset && this._projectAssetType){
			this._projectAssetType.destroyLiveAsset(this.liveAsset);
			this.liveAsset = null;
		}
	}

	async saveLiveAsset(){
		await this.waitForInit();
		const liveAsset = await this.getLiveAsset();
		const assetData = await this._projectAssetType.saveLiveAsset(liveAsset);
		await this.writeAssetData(assetData);
	}

	async getPropertiesAssetContentConstructor(){
		await this.waitForInit();
		if(!this._projectAssetType) return null;
		return this._projectAssetType.constructor.propertiesAssetContentConstructor;
	}

	async getPropertiesAssetContentStructure(){
		await this.waitForInit();
		if(!this._projectAssetType) return null;
		return this._projectAssetType.constructor.propertiesAssetContentStructure;
	}

	async getPropertiesAssetSettingsStructure(){
		await this.waitForInit();
		if(!this._projectAssetType) return null;
		return this._projectAssetType.constructor.assetSettingsStructure;
	}

	async readAssetData(){
		await this.waitForInit();

		let format = "binary";
		if(this._projectAssetType.constructor.storeInProjectAsJson){
			format = "json";
		}else if(this._projectAssetType.constructor.storeInProjectAsText){
			format = "text";
		}

		let fileData = null;
		if(this.isBuiltIn){
			fileData = await editor.builtInAssetManager.fetchAsset(this.path, format);
		}else{
			if(format == "json"){
				fileData = await editor.projectManager.currentProjectFileSystem.readJson(this.path);
			}else if(format == "text"){
				fileData = await editor.projectManager.currentProjectFileSystem.readText(this.path);
			}else{
				fileData = await editor.projectManager.currentProjectFileSystem.readFile(this.path);
			}
		}

		if(format == "json" && this._projectAssetType.constructor.wrapProjectJsonWithEditorMetaData){
			fileData = fileData.asset;
		}
		return fileData;
	}

	async writeAssetData(fileData){
		await this.waitForInit();
		if(this._projectAssetType.constructor.storeInProjectAsJson){
			let json = null;
			if(this._projectAssetType.constructor.wrapProjectJsonWithEditorMetaData){
				json = {
					assetType: this._projectAssetType.constructor.type,
					asset: fileData,
				}
			}else{
				json = fileData;
			}
			await editor.projectManager.currentProjectFileSystem.writeJson(this.path, json);
		}else if(this._projectAssetType.constructor.storeInProjectAsText){
			await editor.projectManager.currentProjectFileSystem.writeText(this.path, fileData);
		}else{
			await editor.projectManager.currentProjectFileSystem.writeBinary(this.path, fileData);
		}
	}

	async getAssetTypeUuid(){
		await this.waitForInit();
		return this._projectAssetType.constructor.typeUuid;
	}

	async getBundledAssetData(assetSettingOverrides = {}){
		await this.waitForInit();
		let binaryData = await this._projectAssetType.createBundledAssetData(assetSettingOverrides);
		if(!binaryData){
			binaryData = await editor.projectManager.currentProjectFileSystem.readFile(this.path);
		}
		return binaryData;
	}

	async fileChangedExternally(){
		await this.waitForInit();
		if(!this._projectAssetType) return;
		await this._projectAssetType.fileChangedExternally();
	}
}
