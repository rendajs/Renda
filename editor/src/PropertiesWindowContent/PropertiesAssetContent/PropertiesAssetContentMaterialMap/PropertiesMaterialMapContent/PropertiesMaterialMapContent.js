
import {PropertiesTreeView} from "../../../../UI/PropertiesTreeView/PropertiesTreeView.js";

/**
 * Responsible for rendering settings ui for a specicic MaterialMap type in
 * the properties window when a material map is selected.
 */
export class PropertiesMaterialMapContent {
	constructor() {
		this.treeView = new PropertiesTreeView();
		/** @type {import("../MaterialMapTypeEntry.js").MaterialMapTypeEntry} */
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
