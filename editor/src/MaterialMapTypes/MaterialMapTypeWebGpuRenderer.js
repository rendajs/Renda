import MaterialMapType from "./MaterialMapType.js";
import {ShaderSource, Vec3} from "../../../src/index.js";
import {SingleInstancePromise} from "../../../src/index.js";
import MaterialMapListUi from "./MaterialMapListUi.js";
import BinaryComposer from "../../../src/Util/BinaryComposer.js";

export default class MaterialMapTypeWebGpuRenderer extends MaterialMapType{

	static uiName = "WebGPU Renderer";
	static typeUuid = "286eaa41-36ce-4d94-9413-d52fc435b6e5";
	static allowExportInAssetBundles = true;

	constructor(treeView){
		super(treeView);

		this.settingsGuiStructure = {
			vertexShader: {
				type: ShaderSource,
				guiOpts: {
					storageType: "projectAsset",
				},
			},
			fragmentShader: {
				type: ShaderSource,
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

	async customAssetDataFromLoad(customData){
		let vertexShader = null;
		let fragmentShader = null;
		if(customData.vertexShader) vertexShader = await editor.projectManager.assetManager.getProjectAsset(customData.vertexShader);
		if(customData.fragmentShader) fragmentShader = await editor.projectManager.assetManager.getProjectAsset(customData.fragmentShader);
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

	static async getLiveAssetCustomData(customData){
		let vertexShader = null;
		let fragmentShader = null;
		if(customData.vertexShader) vertexShader = await editor.projectManager.assetManager.getLiveAsset(customData.vertexShader);
		if(customData.fragmentShader) fragmentShader = await editor.projectManager.assetManager.getLiveAsset(customData.fragmentShader);
		return {vertexShader, fragmentShader};
	}

	static async *getLinkedAssetsInCustomData(customData){
		if(customData.vertexShader) yield editor.projectManager.assetManager.getProjectAsset(customData.vertexShader);
		if(customData.fragmentShader) yield editor.projectManager.assetManager.getProjectAsset(customData.fragmentShader);
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
}
