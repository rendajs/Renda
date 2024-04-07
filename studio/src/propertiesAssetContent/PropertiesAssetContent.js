import { PropertiesTreeView } from "../ui/propertiesTreeView/PropertiesTreeView.js";

/**
 * @template {import("../assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} TAssetType
 */
export class PropertiesAssetContent {
	/**
	 * @param {import("../Studio.js").Studio} studioInstance
	 */
	constructor(studioInstance) {
		this.studioInstance = studioInstance;

		/** @type {import("../assets/ProjectAsset.js").ProjectAsset<TAssetType>[]} */
		this.currentSelection = [];
		this.treeView = new PropertiesTreeView();
	}

	destructor() {}

	/**
	 * @param {import("../assets/ProjectAsset.js").ProjectAsset<TAssetType>[]} currentSelection
	 */
	selectionUpdated(currentSelection) {
		this.currentSelection = currentSelection;
	}
}
