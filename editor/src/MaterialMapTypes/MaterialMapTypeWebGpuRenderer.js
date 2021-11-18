import {MaterialMapType} from "./MaterialMapType.js";
import {WebGpuPipelineConfig} from "../../../src/index.js";
import {StorageType} from "../../../src/Util/BinaryComposer.js";
import editor from "../editorInstance.js";

export class MaterialMapTypeWebGpuRenderer extends MaterialMapType {
	static uiName = "WebGPU Renderer";
	static typeUuid = "286eaa41-36ce-4d94-9413-d52fc435b6e5";
	static allowExportInAssetBundles = true;

	/**
	 * @override
	 * @param {import("../UI/PropertiesTreeView/PropertiesTreeView.js").PropertiesTreeView} treeView
	 */
	constructor(treeView) {
		super(treeView);

		/** @type {import("../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure} */
		this.settingsGuiStructure = {
			forwardPipelineConfig: {
				type: "droppable",
				guiOpts: {
					supportedAssetTypes: [WebGpuPipelineConfig],
				},
			},
		};

		this.settingsTreeView.generateFromSerializableStructure(this.settingsGuiStructure);
		this.settingsTreeView.onChildValueChange(() => {
			this.updateMapListUi();
			this.signalCustomDataChanged();
		});
	}

	async customAssetDataFromLoad(customData) {
		this.settingsTreeView.fillSerializableStructureValues({
			forwardPipelineConfig: customData.forwardPipelineConfig,
		});
	}

	async getCustomAssetDataForSave() {
		const settings = this.getSettingsValues();
		const data = {
			forwardPipelineConfig: settings.forwardPipelineConfig,
		};

		return data;
	}

	static async getLiveAssetCustomData(customData) {
		let forwardPipelineConfig = null;
		if (customData.forwardPipelineConfig) forwardPipelineConfig = await editor.projectManager.assetManager.getLiveAsset(customData.forwardPipelineConfig);
		return {forwardPipelineConfig};
	}

	static async *getLinkedAssetsInCustomData(customData) {
		await editor.projectManager.waitForAssetManagerLoad();
		if (customData.forwardPipelineConfig) yield editor.projectManager.assetManager.getProjectAsset(customData.forwardPipelineConfig);
	}

	static assetBundleBinaryComposerOpts = {
		structure: {
			forwardPipelineConfig: StorageType.ASSET_UUID,
		},
		nameIds: {
			forwardPipelineConfig: 1,
		},
	};

	static mapDataToAssetBundleData(mapData) {
		return mapData;
	}

	getSettingsValues() {
		return this.settingsTreeView.getSerializableStructureValues(this.settingsGuiStructure);
	}
}
