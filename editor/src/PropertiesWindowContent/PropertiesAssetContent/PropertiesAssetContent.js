import {PropertiesTreeView} from "../../UI/PropertiesTreeView/PropertiesTreeView.js";

/**
 * @template {import("../../assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} TAssetType
 */
export class PropertiesAssetContent {
	/**
	 * @param {import("../../Editor.js").Editor} editorInstance
	 */
	constructor(editorInstance) {
		this.editorInstance = editorInstance;

		/** @type {import("../../assets/ProjectAsset.js").ProjectAsset<TAssetType>[]} */
		this.currentSelection = [];
		this.treeView = new PropertiesTreeView();
	}

	destructor() {}

	/**
	 * @param {import("../../assets/ProjectAsset.js").ProjectAsset<TAssetType>[]} currentSelection
	 */
	selectionUpdated(currentSelection) {
		this.currentSelection = currentSelection;
	}
}
