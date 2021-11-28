import {PropertiesAssetContent} from "./PropertiesAssetContent.js";
import ProjectAsset from "../../Assets/ProjectAsset.js";
import editor from "../../editorInstance.js";
import {ContentWindowEntityEditor} from "../../WindowManagement/ContentWindows/ContentWindowEntityEditor.js";

/**
 * @typedef {Object} MaterialAssetData
 * @property {import("../../Util/Util.js").UuidString} map
 * @property {Object.<string, *>} [properties]
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
		this.mapTreeView.onValueChange(() => {
			if (this.isUpdatingUi) return;
			this.notifyEntityEditorsMaterialChanged();
			this.saveAsset();
		});

		this.mapValuesTreeView = materialTree.addCollapsable("map values");

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
		await this.loadMapValues(mapData?.properties);

		this.isUpdatingUi = false;
	}

	async saveAsset() {
		// todo: handle multiple selected items or no selection
		const asset = this.currentSelection[0];
		const {liveAsset} = await asset.getLiveAssetData();
		if (liveAsset) {
			await asset.saveLiveAssetData();
		}
	}

	async selectionUpdated(selectedMaterials) {
		super.selectionUpdated(selectedMaterials);
		this.loadAsset();
	}

	/**
	 * @param {Object.<string, *>} mapValues
	 */
	async loadMapValues(mapValues = {}) {
		this.mapValuesTreeView.clearChildren();
		const mappableValues = await editor.materialMapTypeManager.getMapValuesForMapAssetUuid(this.mapTreeView.value);
		/** @type {import("../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewStructure} */
		for (const valueData of mappableValues) {
			const entry = this.mapValuesTreeView.addItem({
				type: valueData.type,
				/** @type {import("../../UI/PropertiesTreeView/PropertiesTreeViewEntry.js").GuiOptions} */
				guiOpts: {
					label: valueData.name,
					defaultValue: valueData.defaultValue,
				},
			});
			const value = mapValues[valueData.name];
			if (value !== undefined) {
				entry.setValue(value);
			}
			entry.onValueChange(async newValue => {
				if (this.isUpdatingUi) return;

				// todo: support multiselect
				const asset = this.currentSelection[0];
				const {liveAsset} = await asset.getLiveAssetData();
				const liveMaterial = /** @type {import("../../../../src/Rendering/Material.js").Material} */ (liveAsset);
				liveMaterial.setProperties({
					[valueData.name]: newValue,
				});

				this.notifyEntityEditorsMaterialChanged();
				this.saveAsset();
			});
		}
	}

	notifyEntityEditorsMaterialChanged() {
		for (const entityEditor of editor.windowManager.getContentWindowsByConstructor(ContentWindowEntityEditor)) {
			entityEditor.notifyMaterialChanged();
		}
	}
}
