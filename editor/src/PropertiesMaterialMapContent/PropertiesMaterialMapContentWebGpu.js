import {WebGpuPipelineConfig} from "../../../src/index.js";
import {PropertiesMaterialMapContent} from "./PropertiesMaterialMapContent.js";

export class PropertiesMaterialMapContentWebGpu extends PropertiesMaterialMapContent {
	constructor() {
		super();
		/** @type {import("../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure} */
		this.settingsGuiStructure = {
			forwardPipelineConfig: {
				type: "droppable",
				guiOpts: {
					supportedAssetTypes: [WebGpuPipelineConfig],
				},
			},
		};

		this.treeView.generateFromSerializableStructure(this.settingsGuiStructure);
		this.treeView.onChildValueChange(() => {
			this.signalCustomDataChanged();
		});
	}

	/**
	 * @param {import("../MaterialMapTypes/MaterialMapTypeWebGpuRenderer.js").MaterialMapTypeWebGpuRendererSavedCustomData} customData
	 * @override
	 */
	async customAssetDataFromLoad(customData) {
		this.treeView.fillSerializableStructureValues({
			forwardPipelineConfig: customData.forwardPipelineConfig,
		});
	}

	/**
	 * @override
	 */
	async getCustomAssetDataForSave() {
		const settings = this.getSettingsValues();
		const data = {
			forwardPipelineConfig: settings.forwardPipelineConfig,
		};

		return data;
	}

	getSettingsValues() {
		return this.treeView.getSerializableStructureValues(this.settingsGuiStructure);
	}
}
