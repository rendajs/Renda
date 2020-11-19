import MaterialMapType from "./MaterialMapType.js";
import {Vec3, SingleInstancePromise, WebGpuShaderConfiguration} from "../../../src/index.js";
import MaterialMapListUi from "./MaterialMapListUi.js";
import BinaryComposer from "../../../src/Util/BinaryComposer.js";

export default class MaterialMapTypeWebGpuRenderer extends MaterialMapType{

	static uiName = "WebGPU Renderer";
	static typeUuid = "286eaa41-36ce-4d94-9413-d52fc435b6e5";
	static allowExportInAssetBundles = true;

	constructor(treeView){
		super(treeView);

		this.settingsGuiStructure = {
			shaderConfiguration: {
				type: WebGpuShaderConfiguration,
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
		let shaderConfiguration = null;
		if(customData.shaderConfiguration) shaderConfiguration = await editor.projectManager.assetManager.getProjectAsset(customData.shaderConfiguration);
		this.settingsTreeView.fillSerializableStructureValues({shaderConfiguration});
	}

	async getCustomAssetDataForSave(){
		const settings = this.getSettingsValues();
		const data = {
			shaderConfiguration: settings.shaderConfiguration?.uuid || null,
		}

		return data;
	}

	static async getLiveAssetCustomData(customData){
		let shaderConfiguration = null;
		if(customData.shaderConfiguration) shaderConfiguration = await editor.projectManager.assetManager.getLiveAsset(customData.shaderConfiguration);
		return {shaderConfiguration};
	}

	static async *getLinkedAssetsInCustomData(customData){
		if(customData.shaderConfiguration) yield editor.projectManager.assetManager.getProjectAsset(customData.shaderConfiguration);
	}

	static assetBundleDataStructure = {
		configUuid: BinaryComposer.StructureTypes.UUID,
	};

	static assetBundleDataNameIds = {
		configUuid: 1,
	};

	static mapDataToAssetBundleData(mapData){
		return {
			configUuid: mapData.shaderConfiguration,
		};
	}

	getSettingsValues(){
		return this.settingsTreeView.getSerializableStructureValues(this.settingsGuiStructure);
	}
}
