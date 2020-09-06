import {Entity, Material, Shader, Mesh} from "../../../src/index.js";
import editor from "../editorInstance.js";
import {generateUuid} from "../Util/Util.js";
import ProjectAsset from "./ProjectAsset.js";

export default class AssetManager{
	constructor(){
		this.bundles = new Map();
		this.projectAssets = new Map();
		this.liveAssets = new Map();

		this.assetSettingsPath = ["ProjectSettings", "assetSettings.json"];

		this.needsAssetSettingsLoad = true;
		this.loadAssetSettings();
	}

	destructor(){

	}

	get fileSystem(){
		return editor.projectManager.currentProjectFileSystem;
	}

	//todo: either make this async or make sure it
	//isn't called before assetsettings are loaded
	getMainBundleEntry(){
		if(this.bundles.size <= 0){
			this.bundles.set("main", {});
		}
		for(const entry of this.bundles){
			return entry;
		}
	}

	get mainBundleName(){
		this.getMainBundleEntry()[0];
	}

	get mainBundle(){
		this.getMainBundleEntry()[1];
	}

	async loadAssetSettings(fromUserEvent = false){
		if(!this.needsAssetSettingsLoad) return;

		if(!fromUserEvent){
			const hasPermissions = await this.fileSystem.queryPermission(this.assetSettingsPath);
			if(!hasPermissions) return;
		}

		this.needsAssetSettingsLoad = false;
		if(!(await this.fileSystem.isFile(this.assetSettingsPath))) return;
		let json = await this.fileSystem.readJson(this.assetSettingsPath);
		if(json){
			for(const [uuid, assetData] of Object.entries(json.assets)){
				const projectAsset = await ProjectAsset.fromJsonData(uuid, assetData);
				if(projectAsset){
					projectAsset.makeUuidConsistent();
					this.projectAssets.set(uuid, projectAsset);
				}
			}
		}
	}

	async saveAssetSettings(){
		let bundles = [];
		for(const [name, bundleSettings] of this.bundles){
			bundles.push({name, ...bundleSettings});
		}
		let assets = {};
		for(const [uuid, projectAsset] of this.projectAssets){
			if(projectAsset.needsAssetSettingsSave){
				assets[uuid] = projectAsset.toJson();
			}
		}
		await this.fileSystem.writeJson(this.assetSettingsPath, {bundles, assets});
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

	async getAssetUuid(path = []){
		const projectAsset = await this.getProjectAssetFromPath(path);
		if(!projectAsset) return null;
		return projectAsset.uuid;
	}

	async getProjectAsset(uuid){
		await this.loadAssetSettings(true);
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

	moveAsset(fromPath = [], toPath = []){

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
	//asset manager, this method may be called before loadAssetSettings
	//since there is no way to get a liveAsset before calling
	//loadAssetSettings anyway.
	getLiveAssetUuidForAsset(liveAsset){
		for(const [uuid, projectAsset] of this.projectAssets){
			if(projectAsset.liveAsset == liveAsset) return uuid;
		}
		return null;
	}
}
