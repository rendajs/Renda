import {PropertiesAssetContent} from "./PropertiesAssetContent.js";
import ProjectAsset from "../../Assets/ProjectAsset.js";
import editor from "../../editorInstance.js";

/**
 * @typedef {Object} MaterialAssetData
 * @property {import("../../Util/Util.js").UuidString} map
 * @property {Object.<string, *>} mapValues
 */

export class PropertiesAssetContentMaterial extends PropertiesAssetContent {
	constructor() {
		super();
		const materialTree = this.treeView.addCollapsable("material");
		this.mapTreeView = materialTree.addItem({
			type: "droppable",
			guiOpts: {
				supportedAssetTypes: [ProjectAsset],
				label: "Map",
			},
		});

		/** @type {import("../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure} */
		this.currentMapValuesStructure = null;
		this.mapValuesTreeView = materialTree.addCollapsable("map values");
		materialTree.onChildValueChange(() => {
			if (this.isUpdatingUi) return;
			this.saveAsset();
		});

		this.isUpdatingUi = false;
	}

	async loadAsset() {
		// todo: handle multiple selected items or no selection

		const map = this.currentSelection[0];
		/** @type {MaterialAssetData} */
		const mapData = await map.readAssetData();
		this.isUpdatingUi = true;

		const gui = /** @type {import("../../UI/DroppableGui.js").default} */ (this.mapTreeView.gui);
		await gui.setValueFromAssetUuid(mapData?.map);
		this.loadMapValues(mapData?.mapValues);

		this.isUpdatingUi = false;
	}

	saveAsset() {
		// todo: handle multiple selected items or no selection
		const assetData = {};
		assetData.map = this.mapTreeView.value;
		const mapValues = this.mapValuesTreeView.getSerializableStructureValues(this.currentMapValuesStructure, {purpose: "fileStorage"});
		if (mapValues) {
			assetData.mapValues = mapValues;
		}
		this.currentSelection[0].writeAssetData(assetData);
	}

	async selectionUpdated(selectedMaterials) {
		super.selectionUpdated(selectedMaterials);
		this.loadAsset();
	}

	/**
	 * @param {Object.<string, *>} mapValues
	 */
	async loadMapValues(mapValues) {
		this.mapValuesTreeView.clearChildren();
		const mappableValues = await editor.materialMapTypeManager.getMapValuesForMapAssetUuid(this.mapTreeView.value);
		/** @type {import("../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure} */
		const structure = {};
		for (const valueData of mappableValues) {
			structure[valueData.name] = {
				type: valueData.type,
				guiOpts: {
					defaultValue: valueData.defaultValue,
				},
			};
		}
		this.currentMapValuesStructure = structure;
		this.mapValuesTreeView.generateFromSerializableStructure(structure);
		this.mapValuesTreeView.fillSerializableStructureValues(mapValues);
	}
}
