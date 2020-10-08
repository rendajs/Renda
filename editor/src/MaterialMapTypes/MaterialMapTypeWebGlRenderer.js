import MaterialMapType from "./MaterialMapType.js";
import {Shader, Vec3} from "../../../src/index.js";
import {SingleInstancePromise} from "../../../src/index.js";

export default class MaterialMapTypeWebGlRenderer extends MaterialMapType{

	static uiName = "WebGL Renderer";
	static typeUuid = "392a2a4e-c895-4245-9c6d-d6259b8e5267";

	constructor(treeView){
		super(treeView);

		this.settingsGuiStructure = {
			vertexShader: {
				type: Shader,
			},
			fragmentShader: {
				type: Shader,
			},
		};

		this.settingsTreeView = this.treeView.addCollapsable("Shaders");
		this.settingsTreeView.generateFromSerializableStructure(this.settingsGuiStructure);
		this.settingsTreeView.onChildValueChange(_ => {
			this.updateMapListInstance.run();
		});

		this.mapListTreeView = null;

		//todo: if this is already running, run it again when .run() is called
		this.updateMapListInstance = new SingleInstancePromise(async _=> await this.updateMapList(), {once: false});
		this.updateMapListInstance.run();
	}

	getSettingsValues(){
		return this.settingsTreeView.getSerializableStructureValues(this.settingsGuiStructure);
	}

	async updateMapList(){
		if(this.mapListTreeView){
			this.treeView.removeChild(this.mapListTreeView);
		}


		const settings = this.getSettingsValues();

		const itemsMap = new Map();
		await this.addShaderUniformsToMap(settings.vertexShader, itemsMap);
		await this.addShaderUniformsToMap(settings.fragmentShader, itemsMap);

		const items = [];
		for(const [name, itemData] of itemsMap){
			const type = itemData.type;
			items.push({name, type})
		}
		this.mapListTreeView = this.generateMapListUi({items});
		this.treeView.addChild(this.mapListTreeView);
	}

	async addShaderUniformsToMap(shaderAsset, itemsMap){
		for(const {name, type} of await this.getMapItemsIteratorFromShaderAsset(shaderAsset)){
			itemsMap.set(name, {type});
		}
	}

	async getMapItemsIteratorFromShaderAsset(asset){
		if(!asset) return [];
		const shader = await asset.getLiveAsset();
		return this.getMapItemsFromShaderSource(shader.vertSource);
	}

	*getMapItemsFromShaderSource(shaderSrc){
		const re = /^\s+uniform\s(?<type>.+?)\s+(?<name>.+?)\s*;/gm;
		for(const result of shaderSrc.matchAll(re)){
			const name = result.groups.name;
			const type = Number;
			yield {name, type};
		}
	}
}
