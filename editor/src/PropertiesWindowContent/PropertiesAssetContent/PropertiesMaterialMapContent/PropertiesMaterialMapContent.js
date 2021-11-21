
import {PropertiesTreeView} from "../../../UI/PropertiesTreeView/PropertiesTreeView.js";

/**
 * This is the base class for ui rendered in the properties window for material maps.
 */
export class PropertiesMaterialMapContent {
	constructor() {
		this.treeView = new PropertiesTreeView();
		/** @type {import("../../../Assets/MaterialMapTypes/PropertiesAssetContentMaterialMapTypeEntry.js").PropertiesAssetContentMaterialMapTypeEntry} */
		this.mapTypeEntry = null;
	}

	/**
	 * Overide this with your logic to load saved data in your MaterialMap ui.
	 * @param {*} customData
	 */
	async customAssetDataFromLoad(customData) {}

	/**
	 * Override this and return the data you want to save.
	 * This gets called when a MaterialMap is going to be saved.
	 * @returns {Promise<?Object>}
	 */
	async getCustomAssetDataForSave() {}

	/**
	 * Fire this whenever a user changes something that
	 * requires the custom data to be saved.
	 */
	signalCustomDataChanged() {
		this.mapTypeEntry.valueChanged();
	}
}
