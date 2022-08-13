
import {PropertiesTreeView} from "../ui/propertiesTreeView/PropertiesTreeView.js";

/**
 * Responsible for rendering settings ui for a specicic MaterialMap type in
 * the properties window when a material map is selected.
 */
export class PropertiesMaterialMapContent {
	/**
	 * @param {import("../propertiesAssetContent/propertiesAssetContentMaterialMap/MaterialMapTypeEntry.js").MaterialMapTypeEntry} mapTypeEntry
	 */
	constructor(mapTypeEntry) {
		this.mapTypeEntry = mapTypeEntry;
		this.treeView = new PropertiesTreeView();
	}

	/**
	 * This is called when the material map asset selection changes.
	 * This shouldn't be used for updating asset data, as {@linkcode customAssetDataFromLoad}is already used for that.
	 * This is mostly useful for assigning the current parent asset to ui in order to make embedded assets work.
	 * @param {import("../assets/ProjectAsset.js").ProjectAsset<import("../assets/projectAssetType/ProjectAssetTypeMaterialMap.js").ProjectAssetTypeMaterialMap>[]} selectedMaps
	 */
	selectedAssetsUpdated(selectedMaps) {}

	/**
	 * Overide this with your logic to load saved data in your MaterialMap ui.
	 * @param {*} customData
	 */
	async customAssetDataFromLoad(customData) {}

	/**
	 * Override this and return the data you want to save.
	 * This gets called when a MaterialMap is going to be saved.
	 * @returns {Promise<Object?>}
	 */
	async getCustomAssetDataForSave() {
		throw new Error("Base class");
	}

	/**
	 * Fire this whenever a user changes something that
	 * requires the custom data to be saved.
	 */
	signalCustomDataChanged() {
		this.mapTypeEntry.valueChanged();
	}
}
