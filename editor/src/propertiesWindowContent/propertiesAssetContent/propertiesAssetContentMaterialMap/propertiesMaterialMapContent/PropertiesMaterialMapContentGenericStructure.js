import {DroppableGui} from "../../../../ui/DroppableGui.js";
import {PropertiesMaterialMapContent} from "./PropertiesMaterialMapContent.js";

export class PropertiesMaterialMapContentGenericStructure extends PropertiesMaterialMapContent {
	/**
	 * @param {import("../MaterialMapTypeEntry.js").MaterialMapTypeEntry} mapTypeEntry
	 * @param {import("../../../../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure} structure
	 */
	constructor(mapTypeEntry, structure) {
		super(mapTypeEntry);

		this.settingsGuiStructure = structure;

		this.treeView.generateFromSerializableStructure(this.settingsGuiStructure);
		this.treeView.onChildValueChange(() => {
			this.signalCustomDataChanged();
		});
	}

	/**
	 * @override
	 * @param {import("../../../../assets/ProjectAsset.js").ProjectAsset<import("../../../../assets/projectAssetType/projectAssetTypeMaterialMap/ProjectAssetTypeMaterialMap.js").ProjectAssetTypeMaterialMap>[]} selectedMaps
	 */
	selectedAssetsUpdated(selectedMaps) {
		let parentAsset = null;
		if (selectedMaps.length == 1) {
			parentAsset = selectedMaps[0];
		}
		for (const child of this.treeView.traverseDownEntries()) {
			const gui = child.gui;
			if (gui instanceof DroppableGui) {
				if (selectedMaps.length == 1) {
					gui.setEmbeddedParentAsset(parentAsset);
				}
			}
		}
	}

	/**
	 * @param {import("../../../../assets/projectAssetType/projectAssetTypeMaterialMap/materialMapTypes/WebGpuMaterialMapTypeSerializer.js").WebGpuMaterialMapTypeDiskData} customData
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
