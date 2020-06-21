import {Entity, Material, Shader, Mesh} from "../../../src/index.js";
import editor from "../editorInstance.js";
import {generateUuid} from "../Util/Util.js";

export default class AssetManager{
	constructor(){
		this.packages = new Map();
		this.assetDatas = new Map();
		this.liveAssets = new Map();

		this.assetSettingsPath = ["ProjectSettings", "assetSettings.json"];

		this.loadAssetSettings();
	}

	destructor(){

	}

	get fileSystem(){
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
		if(!(await this.fileSystem.isFile(this.assetSettingsPath))) return;
		let json = await this.fileSystem.readJson(this.assetSettingsPath);
		if(json){
			for(const [uuid, asset] of Object.entries(json.assets)){
				if(!asset.assetType){
					asset.assetType = await this.guessAssetType(asset.path);
					asset.forceAssetType = false;
				}
				this.assetDatas.set(uuid, asset);
			}
		}
	}

	async saveAssetSettings(){
		let packages = [];
		for(const [name, packageSettings] of this.packages){
			packages.push({name, ...packageSettings});
		}
		let assets = {};
		for(const [uuid, asset] of this.assetDatas){
			let assetData = {
				path: asset.path,
			}
			if(asset.forceAssetType){
				assetData.assetType = asset.assetType;
			}
			if(asset.package && asset.package != this.mainPackageName){
				assetData.package = asset.package;
			}
			assets[uuid] = assetData;
		}
		await this.fileSystem.writeJson(this.assetSettingsPath, {packages, assets});
	}

	async registerAsset(path = [], assetType = null, forceAssetType = false){
		let uuid = generateUuid();
		if(!assetType){
			assetType = await this.guessAssetType(path);
		}
		this.assetDatas.set(uuid, {path, assetType, forceAssetType});
		await this.saveAssetSettings();
		return uuid;
	}

	async guessAssetType(path = []){
		if(!path || path.length <= 0) return null;
		const fileName = path[path.length - 1];
		if(fileName.endsWith(".jjmesh")) return "mesh";
		const json = await this.fileSystem.readJson(path);
		return json?.assetType ?? "unknown";
	}

	getAssetUuid(path = []){
		for(const [uuid, asset] of this.assetDatas){
			if(this.testPathMatch(path, asset.path)){
				return uuid;
			}
		}
	}

	getAssetPath(uuid){
		const asset = this.assetDatas.get(uuid);
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

	getAssetData(path = []){
		for(const [uuid, asset] of this.assetDatas){
			if(this.testPathMatch(path, asset.path)){
				return {uuid, ...asset};
			}
		}
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

	createMaterialFromJsonData(jsonData){
		const shader = new Shader(`
			attribute vec4 aVertexPosition;

			uniform mat4 uMvpMatrix;

			varying lowp vec4 vColor;

			void main() {
			  gl_Position = uMvpMatrix * aVertexPosition;
			  vColor = aVertexPosition;
			}
		`,`
			varying lowp vec4 vColor;

			void main() {
				gl_FragColor = vec4(abs(vColor).rgb, 1.0);
			}
		`);
		const material = new Material(shader);
		return material;
	}

	async getLiveAsset(uuid){
		let liveAssetData = this.liveAssets.get(uuid);
		if(liveAssetData) return liveAssetData;
		const assetData = this.assetDatas.get(uuid);
		if(!assetData) return null;

		liveAssetData = {
			asset: null,
			fileName: assetData.path[assetData.path.length -1],
		};
		if(assetData.assetType == "material"){
			const json = await this.fileSystem.readJson(assetData.path);
			const material = this.createMaterialFromJsonData(json);
			liveAssetData.asset = material;
		}else if(assetData.assetType == "mesh"){
			const blob = await this.fileSystem.readFile(assetData.path);
			const mesh = await Mesh.fromBlob(blob);
			liveAssetData.asset = mesh;
		}else{
			return null;
		}
		this.liveAssets.set(uuid, liveAssetData);
		return liveAssetData;
	}

	getLiveAssetUuidForAsset(asset){
		for(const [uuid, liveAssetData] of this.liveAssets){
			if(liveAssetData.asset == asset) return uuid;
		}
		return null;
	}
}
