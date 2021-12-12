import {PropertiesAssetContent} from "./PropertiesAssetContent.js";
import {getEditorInstance} from "../../editorInstance.js";
import {ContentWindowEntityEditor} from "../../WindowManagement/ContentWindows/ContentWindowEntityEditor.js";
import {MaterialMap} from "../../../../src/Rendering/MaterialMap.js";

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
				supportedAssetTypes: [MaterialMap],
				label: "Map",
			},
		});
		this.mapTreeView.onValueChange(async () => {
			if (this.isUpdatingUi) return;

			// todo: support multiselect
			const asset = this.currentSelection[0];
			const {liveAsset} = await asset.getLiveAssetData();
			const liveMaterial = /** @type {import("../../../../src/Rendering/Material.js").Material} */ (liveAsset);

			const mapAsset = this.mapTreeView.getValue({purpose: "script"});
			liveMaterial.setMaterialMap(mapAsset);

			await this.loadMapValues();
			this.notifyEntityEditorsMaterialChanged();
			this.saveAsset();
		});

		this.mapValuesTreeView = materialTree.addCollapsable("map values");

		this.isUpdatingUi = false;
	}

	/**
	 * @returns {Promise<import("../../../../src/Rendering/Material.js").Material>}
	 */
	async getFirstSelectedLiveAsset() {
		/** @type {import("../../Assets/ProjectAsset.js").ProjectAsset} */
		const asset = this.currentSelection[0];
		const liveAsset = await asset.getLiveAsset();
		const material = /** @type {import("../../../../src/Rendering/Material.js").Material} */ (liveAsset);
		return material;
	}

	async loadAsset() {
		// todo: handle multiple selected items or no selection

		this.isUpdatingUi = true;

		const material = await this.getFirstSelectedLiveAsset();
		const gui = /** @type {import("../../UI/DroppableGui.js").DroppableGui} */ (this.mapTreeView.gui);
		await gui.setValue(material.materialMap);
		await this.loadMapValues();

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

	async loadMapValues() {
		this.mapValuesTreeView.clearChildren();
		const material = await this.getFirstSelectedLiveAsset();
		const currentMaterialValues = {};
		for (const [key, value] of material.getAllProperties()) {
			currentMaterialValues[key] = value;
		}
		const mappableValues = await getEditorInstance().materialMapTypeManager.getMapValuesForMapAssetUuid(this.mapTreeView.value);
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
			const value = currentMaterialValues[valueData.name];
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
		for (const entityEditor of getEditorInstance().windowManager.getContentWindowsByConstructor(ContentWindowEntityEditor)) {
			entityEditor.notifyMaterialChanged();
		}
	}
}
