import editor from "../editorInstance.js";
import SingleInstancePromise from "../Util/SingleInstancePromise.js";

export default class ProjectAsset{
	constructor({
		uuid = null,
		path = [],
		assetType = null,
		forceAssetType = false,
	} = {}){
		this.uuid = uuid;
		this.path = path;
		this.assetType = assetType;
		this.forceAssetType = forceAssetType;

		this.projectAssetType = null;
		this.liveAsset = null;

		this.initInstance = new SingleInstancePromise(async _=> this.init());
		this.initInstance.run();
	}

	async init(){
		if(!this.assetType){
			this.assetType = await ProjectAsset.guessAssetTypeFromFile(this.path);
		}

		const AssetTypeConstructor = editor.projectAssetTypeManager.getAssetType(this.assetType);
		this.projectAssetType = new AssetTypeConstructor(this);
	}

	async waitForInit(){
		await this.initInstance.run();
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
		if(fileName.endsWith(".jjmesh")) return "mesh";
		if(fileName.endsWith(".js")) return "javascript";
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

	toJson(){
		const assetData = {
			path: this.path,
		}
		if(this.forceAssetType){
			assetData.assetType = this.assetType;
		}
		return assetData;
	}

	async open(){
		await this.waitForInit();
		await this.projectAssetType.open();
	}

	//todo: make sure this promise has only one instance running at a time
	async getLiveAsset(){
		if(this.liveAsset) return this.liveAsset;

		await this.waitForInit();
		let fileData = null;
		if(this.projectAssetType.constructor.storeInProjectAsJson){
			const json = await editor.projectManager.currentProjectFileSystem.readJson(this.path);
			fileData = json.asset;
		}else{
			fileData = await editor.projectManager.currentProjectFileSystem.readFile(this.path);
		}

		this.liveAsset = await this.projectAssetType.getLiveAsset(fileData);
		return this.liveAsset;
	}

	async getPropertiesAssetContentConstructor(){
		await this.waitForInit();
		return this.projectAssetType.constructor.propertiesAssetContentConstructor;
	}

	async getPropertiesAssetSettingsStructure(){
		await this.waitForInit();
		return this.projectAssetType.constructor.assetSettingsStructure;
	}

	saveLiveAsset(){} //todo
}
