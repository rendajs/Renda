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
	 * @param {import("../../../../assets/ProjectAsset.js").ProjectAsset<import("../../../../assets/projectAssetType/MaterialMapProjectAssetType.js").MaterialMapProjectAssetType>[]} selectedMaps
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
					if (!parentAsset) {
						throw new Error("Assertion failed, parentAsset should be set when only one map is selected");
					}
					gui.setEmbeddedParentAsset(parentAsset);
				} else {
					gui.removeEmbeddedAssetSupport();
				}
			}
		}
	}

	/**
	 * @param {*} customData
	 * @override
	 */
	async customAssetDataFromLoad(customData) {
		this.treeView.fillSerializableStructureValues(customData, {
			isDiskData: true,
		});
	}

	/**
	 * @override
	 */
	async getCustomAssetDataForSave() {
		return this.treeView.getSerializableStructureValues(this.settingsGuiStructure);
	}
}
