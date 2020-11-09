import editor from "../editorInstance.js";
import {generateUuid} from "../Util/Util.js";
import ProjectAsset from "./ProjectAsset.js";

export default class AssetManager{
	constructor(){
		this.projectAssets = new Map();

		this.assetSettingsPath = ["ProjectSettings", "assetSettings.json"];

		this.assetSettingsLoaded = false;
		this.loadAssetSettings();

		this.boundExternalChange = this.externalChange.bind(this);
		editor.projectManager.onExternalChange(this.boundExternalChange);
	}

	destructor(){
		editor.projectManager.removeOnExternalChange(this.boundExternalChange);
		this.boundExternalChange = null;
	}

	get fileSystem(){
		return editor.projectManager.currentProjectFileSystem;
	}

	async loadAssetSettings(fromUserEvent = false){
		if(this.assetSettingsLoaded) return;

		if(!fromUserEvent){
			const hasPermissions = await this.fileSystem.queryPermission(this.assetSettingsPath);
			if(!hasPermissions) return;
		}

		this.assetSettingsLoaded = true;
		if(!(await this.fileSystem.isFile(this.assetSettingsPath))) return;
		let json = await this.fileSystem.readJson(this.assetSettingsPath);
		if(json){
			for(const [uuid, assetData] of Object.entries(json.assets)){
				const projectAsset = await ProjectAsset.fromJsonData(uuid, assetData);
				if(projectAsset){
					projectAsset.makeUuidConsistent(false);
					this.projectAssets.set(uuid, projectAsset);
				}
			}
		}
	}

	async saveAssetSettings(){
		let assets = {};
		for(const [uuid, projectAsset] of this.projectAssets){
			if(projectAsset.needsAssetSettingsSave){
				assets[uuid] = projectAsset.toJson();
			}
		}
		await this.fileSystem.writeJson(this.assetSettingsPath, {assets});
	}

	async registerAsset(path = [], assetType = null, forceAssetType = false){
		await this.loadAssetSettings(true);
		const uuid = generateUuid();
		const projectAsset = new ProjectAsset({uuid, path, assetType, forceAssetType});
		this.projectAssets.set(uuid, projectAsset);
		if(projectAsset.needsAssetSettingsSave){
			this.saveAssetSettings();
		}
		return projectAsset;
	}

	async makeAssetUuidConsistent(asset){
		if(asset.needsConsistentUuid) return;
		asset.makeUuidConsistent();
		await this.saveAssetSettings();
	}

	async externalChange(e){
		const projectAsset = await this.getProjectAssetFromPath(e.path);
		if(projectAsset){
			const guessedType = await ProjectAsset.guessAssetTypeFromFile(e.path);
			if(guessedType != projectAsset.assetType){
				//todo
				console.warn("nyi, changing assetType");
			}else{
				await projectAsset.fileChangedExternally();
			}
		}
	}

	async getAssetUuid(path = []){
		const projectAsset = await this.getProjectAssetFromPath(path);
		if(!projectAsset) return null;
		return projectAsset.uuid;
	}

	async getProjectAsset(uuid){
		await this.loadAssetSettings(true);
		return this.projectAssets.get(uuid);
	}

	getProjectAssetImmediate(uuid){
		if(!this.assetSettingsLoaded) return null;
		return this.projectAssets.get(uuid);
	}

	async getAssetPathFromUuid(uuid){
		await this.loadAssetSettings(true);
		const asset = this.projectAssets.get(uuid);
		if(!asset) return null;
		return asset.path.slice();
	}

	testPathMatch(path1 = [], path2 = []){
		if(path1.length != path2.length) return false;
		for(let i=0; i<path1.length; i++){
			if(path1[i] != path2[i]) return false;
		}
		return true;
	}

	async getProjectAssetFromPath(path = []){
		await this.loadAssetSettings(true);
		for(const [uuid, asset] of this.projectAssets){
			if(this.testPathMatch(path, asset.path)){
				return asset;
			}
		}

		//no existing project asset was found, check if the file exists
		if(await this.fileSystem.isFile(path)){
			//create a new project asset
			return await this.registerAsset(path);
		}
		return null;
	}

	async assetMoved(fromPath = [], toPath = []){
		const asset = await this.getProjectAssetFromPath(fromPath);
		asset.assetMoved(toPath);
		await this.saveAssetSettings();
	}

	async getAssetSettings(path = []){
		await this.loadAssetSettings(true);
	}

	setAssetSettings(path = [], settings = {}){

	}

	async getLiveAsset(uuid){
		await this.loadAssetSettings(true);
		const projectAsset = this.projectAssets.get(uuid);
		if(!projectAsset) return null;

		return await projectAsset.getLiveAsset();
	}

	//LoadAssetSettings is expected to be called
	//(from a user gesture) before calling this method.
	//If `liveAsset` is not a live asset generated from the
	//asset manager, this method is allowed to be called before loadAssetSettings
	//since there is no way to get a liveAsset before calling
	//loadAssetSettings anyway.
	getProjectAssetForLiveAsset(liveAsset){
		for(const projectAsset of this.projectAssets.values()){
			if(projectAsset.liveAsset == liveAsset) return projectAsset;
		}
		return null;
	}
}
