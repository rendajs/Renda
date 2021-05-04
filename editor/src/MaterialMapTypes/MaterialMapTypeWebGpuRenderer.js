import MaterialMapType from "./MaterialMapType.js";
import {Vec3, SingleInstancePromise, WebGpuPipelineConfiguration} from "../../../src/index.js";
import MaterialMapListUi from "./MaterialMapListUi.js";
import BinaryComposer from "../../../src/Util/BinaryComposer.js";

export default class MaterialMapTypeWebGpuRenderer extends MaterialMapType{

	static uiName = "WebGPU Renderer";
	static typeUuid = "286eaa41-36ce-4d94-9413-d52fc435b6e5";
	static allowExportInAssetBundles = true;

	constructor(treeView){
		super(treeView);

		this.settingsGuiStructure = {
			forwardPipelineConfiguration: {
				type: WebGpuPipelineConfiguration,
				guiOpts: {
					storageType: "projectAsset",
				},
			},
		};

		this.settingsTreeView.generateFromSerializableStructure(this.settingsGuiStructure);
		this.settingsTreeView.onChildValueChange(() => {
			this.updateMapListUi();
			this.signalCustomDataChanged();
		});
	}

	async customAssetDataFromLoad(customData){
		let forwardPipelineConfiguration = null;
		if(customData.forwardPipelineConfiguration) forwardPipelineConfiguration = await editor.projectManager.assetManager.getProjectAsset(customData.forwardPipelineConfiguration);
		this.settingsTreeView.fillSerializableStructureValues({forwardPipelineConfiguration});
	}

	async getCustomAssetDataForSave(){
		const settings = this.getSettingsValues();
		const data = {
			forwardPipelineConfiguration: settings.forwardPipelineConfiguration?.uuid || null,
		}

		return data;
	}

	static async getLiveAssetCustomData(customData){
		let forwardPipelineConfiguration = null;
		if(customData.forwardPipelineConfiguration) forwardPipelineConfiguration = await editor.projectManager.assetManager.getLiveAsset(customData.forwardPipelineConfiguration);
		return {forwardPipelineConfiguration};
	}

	static async *getLinkedAssetsInCustomData(customData){
		if(customData.forwardPipelineConfiguration) yield editor.projectManager.assetManager.getProjectAsset(customData.forwardPipelineConfiguration);
	}

	static assetBundleDataStructure = {
		forwardPipelineConfiguration: BinaryComposer.StructureTypes.UUID,
	};

	static assetBundleDataNameIds = {
		forwardPipelineConfiguration: 1,
	};

	static mapDataToAssetBundleData(mapData){
		return mapData;
	}

	getSettingsValues(){
		return this.settingsTreeView.getSerializableStructureValues(this.settingsGuiStructure);
	}
}
