import MaterialMapType from "./MaterialMapType.js";
import {Vec3, SingleInstancePromise, WebGpuPipelineConfig} from "../../../src/index.js";
import MaterialMapListUi from "./MaterialMapListUi.js";
import BinaryComposer from "../../../src/Util/BinaryComposer.js";

export default class MaterialMapTypeWebGpuRenderer extends MaterialMapType{

	static uiName = "WebGPU Renderer";
	static typeUuid = "286eaa41-36ce-4d94-9413-d52fc435b6e5";
	static allowExportInAssetBundles = true;

	constructor(treeView){
		super(treeView);

		this.settingsGuiStructure = {
			forwardPipelineConfig: {
				type: WebGpuPipelineConfig,
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
		let forwardPipelineConfig = null;
		if(customData.forwardPipelineConfig) forwardPipelineConfig = await editor.projectManager.assetManager.getProjectAsset(customData.forwardPipelineConfig);
		this.settingsTreeView.fillSerializableStructureValues({forwardPipelineConfig});
	}

	async getCustomAssetDataForSave(){
		const settings = this.getSettingsValues();
		const data = {
			forwardPipelineConfig: settings.forwardPipelineConfig?.uuid || null,
		}

		return data;
	}

	static async getLiveAssetCustomData(customData){
		let forwardPipelineConfig = null;
		if(customData.forwardPipelineConfig) forwardPipelineConfig = await editor.projectManager.assetManager.getLiveAsset(customData.forwardPipelineConfig);
		return {forwardPipelineConfig};
	}

	static async *getLinkedAssetsInCustomData(customData){
		if(customData.forwardPipelineConfig) yield editor.projectManager.assetManager.getProjectAsset(customData.forwardPipelineConfig);
	}

	static assetBundleBinaryComposerOpts = {
		structure: {
			forwardPipelineConfig: BinaryComposer.StructureTypes.ASSET_UUID,
		},
		nameIds: {
			forwardPipelineConfig: 1,
		},
	}

	static mapDataToAssetBundleData(mapData){
		return mapData;
	}

	getSettingsValues(){
		return this.settingsTreeView.getSerializableStructureValues(this.settingsGuiStructure);
	}
}
