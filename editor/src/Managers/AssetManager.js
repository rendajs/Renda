import {Entity} from "../../../src/index.js";
import editor from "../editorInstance.js";
import {Uuid} from "../Util/Util.js";

export default class AssetManager{
	constructor(){
		this.packages = new Map();
		this.assets = new Map();

		this.assetSettingsPath = ["ProjectSettings", "assetSettings.json"];

		this.loadAssetSettings();
	}

	destructor(){

	}

	getFileSystem(){
		return editor.projectManager.currentProjectFileSystem;
	}

	getMainPackageEntry(){
		if(this.packages.size <= 0){
			this.packages.set("main", {});
		}
		for(const entry of this.packages){
			return entry;
		}
	}

	get mainPackageName(){
		this.getMainPackageEntry()[0];
	}

	get mainPackage(){
		this.getMainPackageEntry()[1];
	}

	async loadAssetSettings(){
		let json = await this.getFileSystem().readJson(this.assetSettingsPath);
		for(const [uuid, asset] of Object.entries(json.assets)){
			this.assets.set(uuid, asset);
		}
	}

	async saveAssetSettings(){
		let packages = [];
		for(const [name, packageSettings] of this.packages){
			packages.push({name, ...packageSettings});
		}
		let assets = {};
		for(const [uuid, asset] of this.assets){
			let assetData = {
				path: asset.path,
			}
			if(asset.package && asset.package != this.mainPackageName){
				assetData.package = asset.package;
			}
			assets[uuid] = assetData;
		}
		let fileSystem = this.getFileSystem();
		await fileSystem.writeJson(this.assetSettingsPath, {packages, assets});
	}

	async registerAsset(path = []){
		let uuid = Uuid();
		this.assets.set(uuid, {
			path,
		});
		await this.saveAssetSettings();
		return uuid;
	}

	getAssetUuid(path = []){

	}

	getAsset(uuid){

	}

	moveAsset(fromPath = [], toPath = []){

	}

	getAssetSettings(path = []){

	}

	setAssetSettings(path = [], settings = {}){

	}

	createEntityFromJsonData(jsonData){
		let ent = new Entity(jsonData.name || "");
		for(const childJson of (jsonData.children || [])){
			let child = this.createEntityFromJsonData(childJson);
			ent.add(child);
		}
		return ent;
	}
}
