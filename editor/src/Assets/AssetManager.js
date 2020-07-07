import {Entity, Material, Shader, Mesh, defaultComponentTypeManager} from "../../../src/index.js";
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

	async registerAsset(path = [], assetType = null, forceAssetType = false){
		const uuid = generateUuid();
		if(!assetType){
			assetType = await this.guessAssetType(path);
		}
		const projectAsset = new ProjectAsset({uuid, path, assetType, forceAssetType});
		this.projectAssets.set(uuid, projectAsset);
		await this.saveAssetSettings();
		return uuid;
	}

	getAssetUuid(path = []){
		const projectAsset = this.getProjectAssetFromPath(path);
		if(!projectAsset) return null;
		return projectAsset.uuid;
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
	}

	moveAsset(fromPath = [], toPath = []){

	}

	getAssetSettings(path = []){

	}

	setAssetSettings(path = [], settings = {}){

	}

	async createEntityFromJsonData(jsonData){
		let ent = new Entity({
			name: jsonData.name || "",
			matrix: jsonData.matrix,
		});
		if(jsonData.components){
			for(const component of jsonData.components){
				const componentType = component.type;
				const componentNamespace = component.namespace;
				const componentData = defaultComponentTypeManager.getComponentData(componentType, componentNamespace);
				const componentPropertyValues = await this.componentPropertyValuesFromJson(component.propertyValues, componentData);
				ent.addComponent(componentType, componentPropertyValues, {componentNamespace});
			}
		}
		if(jsonData.children){
			for(const childJson of jsonData.children){
				let child = await this.createEntityFromJsonData(childJson);
				ent.add(child);
			}
		}
		return ent;
	}

	async componentPropertyValuesFromJson(jsonData, componentData){
		const componentProperties = componentData?.properties;
		const newPropertyValues = {}
		if(componentProperties){
			for(const [name, propertyData] of Object.entries(componentProperties)){
				newPropertyValues[name] = await this.componentPropertyValueFromJson(jsonData[name], propertyData);
			}
		}
		return newPropertyValues;
	}

	async componentPropertyValueFromJson(propertyValue, propertyData){
		if(propertyData.type == Array){
			const newArr = [];
			for(const item of propertyValue){
				newArr.push(await this.componentPropertyValueFromJson(item, propertyData.arrayTypeOpts));
			}
			return newArr;
		}
		if(propertyData.type == Mesh || propertyData.type == Material){
			const liveAsset = await this.getLiveAsset(propertyValue);
			return liveAsset.asset;
		}
		return propertyValue;
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
		const assetData = this.projectAssets.get(uuid);
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
