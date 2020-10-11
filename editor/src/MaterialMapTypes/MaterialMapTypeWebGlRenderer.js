import MaterialMapType from "./MaterialMapType.js";
import {Shader, Vec3} from "../../../src/index.js";
import {SingleInstancePromise} from "../../../src/index.js";
import MaterialMapListUi from "./MaterialMapListUi.js";

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

		this.mapListUi = null;

		//todo: if this is already running, run it again when .run() is called
		this.updateMapListInstance = new SingleInstancePromise(async _=> await this.updateMapList(), {once: false});
		this.updateMapListInstance.run();
	}

	async loadData(data){
		let vertexShader = null;
		let fragmentShader = null;
		if(data.vertexShader) vertexShader = await editor.projectManager.assetManager.getProjectAsset(data.vertexShader);
		if(data.fragmentShader) fragmentShader = await editor.projectManager.assetManager.getProjectAsset(data.fragmentShader);
		this.settingsTreeView.fillSerializableStructureValues({vertexShader, fragmentShader});

		await this.updateMapList();
		this.fillMapListValues(data.mapList);
	}

	async getData(){
		const settings = this.getSettingsValues();
		const data = {
			vertexShader: settings.vertexShader.uuid,
			fragmentShader: settings.fragmentShader.uuid,
		}
		if(this.mapListUi){
			data.mapList = this.mapListUi.getValues();
		}

		return data;
	}

	getSettingsValues(){
		return this.settingsTreeView.getSerializableStructureValues(this.settingsGuiStructure);
	}

	async updateMapList(){
		if(this.mapListUi){
			this.mapListUi.destructor();
			this.mapListUi = null;
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
		this.mapListUi = new MaterialMapListUi({items});
		this.treeView.addChild(this.mapListUi.treeView);
		this.mapListUi.onValueChange(_ => {
			this.valueChanged();
		});
	}

	fillMapListValues(values){
		if(!this.mapListUi) return;
		this.mapListUi.setValues(values);
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
