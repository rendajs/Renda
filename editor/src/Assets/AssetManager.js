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

		this.loadAssetSettings();
	}

	destructor(){

	}

	get fileSystem(){
		return editor.projectManager.currentProjectFileSystem;
	}

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

	async loadAssetSettings(){
		if(!(await this.fileSystem.isFile(this.assetSettingsPath))) return;
		let json = await this.fileSystem.readJson(this.assetSettingsPath);
		if(json){
			for(const [uuid, assetData] of Object.entries(json.assets)){
				const projectAsset = await ProjectAsset.fromJsonData(uuid, assetData);
				if(projectAsset){
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
			assets[uuid] = projectAsset.toJson();
		}
		await this.fileSystem.writeJson(this.assetSettingsPath, {bundles, assets});
	}

	registerAsset(path = [], assetType = null, forceAssetType = false){
		const uuid = generateUuid();
		const projectAsset = new ProjectAsset({uuid, path, assetType, forceAssetType});
		this.projectAssets.set(uuid, projectAsset);
		this.saveAssetSettings();
		return projectAsset;
	}

	getAssetUuid(path = []){
		const projectAsset = this.getProjectAssetFromPath(path);
		if(!projectAsset) return null;
		return projectAsset.uuid;
	}

	getProjectAsset(uuid){
		return this.projectAssets.get(uuid);
	}

	getAssetPathFromUuid(uuid){
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

	getProjectAssetFromPath(path = []){
		for(const [uuid, asset] of this.projectAssets){
			if(this.testPathMatch(path, asset.path)){
				return asset;
			}
		}

		//no existing project asset was found, check if the file exists
		if(this.fileSystem.isFile(path)){
			//create a new project asset
			return this.registerAsset(path);
		}
	}

	moveAsset(fromPath = [], toPath = []){

	}

	getAssetSettings(path = []){

	}

	setAssetSettings(path = [], settings = {}){

	}

	async getLiveAsset(uuid){
		const projectAsset = this.projectAssets.get(uuid);
		if(!projectAsset) return null;

		return await projectAsset.getLiveAsset();
	}

	getLiveAssetUuidForAsset(liveAsset){
		for(const [uuid, projectAsset] of this.projectAssets){
			if(projectAsset.liveAsset == liveAsset) return uuid;
		}
		return null;
	}
}
