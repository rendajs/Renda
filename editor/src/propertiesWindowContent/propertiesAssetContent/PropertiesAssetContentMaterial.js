import {PropertiesAssetContent} from "./PropertiesAssetContent.js";
import {ContentWindowEntityEditor} from "../../windowManagement/contentWindows/ContentWindowEntityEditor.js";
import {MaterialMap} from "../../../../src/rendering/MaterialMap.js";
import {MATERIAL_MAP_PERSISTENCE_KEY} from "../../assets/projectAssetType/ProjectAssetTypeMaterial.js";

/**
 * @typedef {Object} MaterialAssetData
 * @property {import("../../../../src/util/mod.js").UuidString | object} [map]
 * @property {Object.<string, *>} [properties]
 */

/**
 * @extends {PropertiesAssetContent<import("../../assets/projectAssetType/ProjectAssetTypeMaterial.js").ProjectAssetTypeMaterial>}
 */
export class PropertiesAssetContentMaterial extends PropertiesAssetContent {
	/**
	 * @param {ConstructorParameters<typeof PropertiesAssetContent>} args
	 */
	constructor(...args) {
		super(...args);

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
			const {liveAsset: material} = await asset.getLiveAssetData();

			const mapAsset = this.mapTreeView.getValue({purpose: "script"});
			material.setMaterialMap(mapAsset);

			await this.loadMapValues();
			this.notifyEntityEditorsMaterialChanged();
			this.saveAsset();
		});

		this.mapValuesTreeView = materialTree.addCollapsable("map values");

		this.isUpdatingUi = false;
	}

	/**
	 * @returns {Promise<import("../../../../src/rendering/Material.js").Material>}
	 */
	async getFirstSelectedLiveAsset() {
		const asset = this.currentSelection[0];
		const liveAsset = await asset.getLiveAsset();
		const material = /** @type {import("../../../../src/rendering/Material.js").Material} */ (liveAsset);
		return material;
	}

	async loadAsset() {
		// todo: handle multiple selected items or no selection

		this.isUpdatingUi = true;

		const material = await this.getFirstSelectedLiveAsset();
		if (this.currentSelection.length > 1) {
			this.mapTreeView.gui.removeEmbeddedAssetSupport();
		} else {
			this.mapTreeView.gui.setEmbeddedParentAsset(this.currentSelection[0], MATERIAL_MAP_PERSISTENCE_KEY);
		}
		this.mapTreeView.setValue(material.materialMap);
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

	/**
	 * @override
	 * @param {import("../../assets/ProjectAsset.js").ProjectAsset<any>[]} selectedMaterials
	 */
	async selectionUpdated(selectedMaterials) {
		super.selectionUpdated(selectedMaterials);
		await this.loadAsset();
	}

	async loadMapValues() {
		this.mapValuesTreeView.clearChildren();
		const material = await this.getFirstSelectedLiveAsset();
		/** @type {Object.<string, unknown>} */
		const currentMaterialValues = {};
		for (const [key, value] of material.getAllProperties()) {
			currentMaterialValues[key] = value;
		}
		if (!this.mapTreeView.value) return;

		const mappableValues = await this.editorInstance.materialMapTypeManager.getMapValuesForMapAssetUuid(this.mapTreeView.value);
		/** @type {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure} */
		for (const valueData of mappableValues) {
			/** @type {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewEntryOptionsGeneric<any>} */
			const addItemOpts = {
				type: valueData.type,
				guiOpts: {
					label: valueData.name,
					defaultValue: valueData.defaultValue,
				},
			};
			const entry = this.mapValuesTreeView.addItem(addItemOpts);
			const value = currentMaterialValues[valueData.name];
			if (value !== undefined) {
				entry.setValue(value);
			}
			entry.onValueChange(async newValue => {
				if (this.isUpdatingUi) return;

				MaterialMap.assertIsMappableType(newValue);

				// todo: support multiselect
				const asset = this.currentSelection[0];
				const {liveAsset: material} = await asset.getLiveAssetData();
				material.setProperty(valueData.name, newValue);

				this.notifyEntityEditorsMaterialChanged();
				this.saveAsset();
			});
		}
	}

	notifyEntityEditorsMaterialChanged() {
		for (const entityEditor of this.editorInstance.windowManager.getContentWindowsByConstructor(ContentWindowEntityEditor)) {
			entityEditor.notifyMaterialChanged();
		}
	}
}
