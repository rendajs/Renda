import MaterialMapType from "./MaterialMapType.js";
import {Shader, Vec3} from "../../../src/index.js";
import {SingleInstancePromise} from "../../../src/index.js";
import MaterialMapListUi from "./MaterialMapListUi.js";
import BinaryComposer from "../../../src/Util/BinaryComposer.js";

export default class MaterialMapTypeWebGlRenderer extends MaterialMapType{

	static uiName = "WebGL Renderer";
	static typeUuid = "392a2a4e-c895-4245-9c6d-d6259b8e5267";
	static allowExportInAssetBundles = true;

	constructor(treeView){
		super(treeView);

		this.settingsGuiStructure = {
			vertexShader: {
				type: Shader,
				guiOpts: {
					storageType: "projectAsset",
				},
			},
			fragmentShader: {
				type: Shader,
				guiOpts: {
					storageType: "projectAsset",
				},
			},
		};

		this.settingsTreeView.generateFromSerializableStructure(this.settingsGuiStructure);
		this.settingsTreeView.onChildValueChange(_ => {
			this.updateMapListUi();
			this.signalCustomDataChanged();
		});
	}

	async customAssetDataFromLoad(data){
		let vertexShader = null;
		let fragmentShader = null;
		if(data.vertexShader) vertexShader = await editor.projectManager.assetManager.getProjectAsset(data.vertexShader);
		if(data.fragmentShader) fragmentShader = await editor.projectManager.assetManager.getProjectAsset(data.fragmentShader);
		this.settingsTreeView.fillSerializableStructureValues({vertexShader, fragmentShader});
	}

	async getCustomAssetDataForSave(){
		const settings = this.getSettingsValues();
		const data = {
			vertexShader: settings.vertexShader?.uuid || null,
			fragmentShader: settings.fragmentShader?.uuid || null,
		}

		return data;
	}

	static assetBundleDataStructure = {
		vertUuid: BinaryComposer.StructureTypes.UUID,
		fragUuid: BinaryComposer.StructureTypes.UUID,
	};

	static assetBundleDataNameIds = {
		vertUuid: 1,
		fragUuid: 2,
	};

	static mapDataToAssetBundleData(mapData){
		return {
			vertUuid: mapData.vertexShader,
			fragUuid: mapData.fragmentShader,
		};
	}

	getSettingsValues(){
		return this.settingsTreeView.getSerializableStructureValues(this.settingsGuiStructure);
	}

	static async getMappableValues(customData){
		const itemsMap = new Map();
		await this.addShaderUniformsToMap(customData.vertexShader, itemsMap);
		await this.addShaderUniformsToMap(customData.fragmentShader, itemsMap);

		const items = [];
		for(const [name, itemData] of itemsMap){
			const type = itemData.type;
			items.push({name, type})
		}
		return items;
	}

	static async addShaderUniformsToMap(shaderUuid, itemsMap){
		const shaderAsset = await editor.projectManager.assetManager.getProjectAsset(shaderUuid);
		for(const {name, type} of await this.getMapItemsIteratorFromShaderAsset(shaderAsset)){
			itemsMap.set(name, {type});
		}
	}

	static async getMapItemsIteratorFromShaderAsset(asset){
		if(!asset) return [];
		const shader = await asset.getLiveAsset();
		return this.getMapItemsFromShaderSource(shader.vertSource);
	}

	static *getMapItemsFromShaderSource(shaderSrc){
		const re = /^\s*uniform\s(?<type>.+?)\s+(?<name>.+?)\s*;/gm;
		for(const result of shaderSrc.matchAll(re)){
			const name = result.groups.name;
			let type = null;
			if(result.groups.type == "float"){
				type = Number;
			}else if(result.groups.type == "vec3"){
				type = Vec3;
			}
			yield {name, type};
		}
	}
}
