import {PropertiesTreeViewEntry} from "./PropertiesTreeViewEntry.js";
import {TreeView} from "./TreeView.js";

/**
 * @typedef {Object} PropertiesTreeViewSpyOnly
 * @property {*} [value]
 */

/**
 * @typedef {import("./TreeView.js").TreeViewSpy & PropertiesTreeViewSpyOnly} PropertiesTreeViewSpy
 */

export class PropertiesTreeView extends TreeView {
	constructor() {
		super();

		/** @type {import("./TreeView.js").TreeViewSpy} */
		const superSpy = this.spy;

		/** @type {PropertiesTreeViewSpy} */
		this.spy = {
			...superSpy,
		};
	}

	addCollapsable() {
		return new PropertiesTreeView();
	}

	addItem() {
		return new PropertiesTreeViewEntry();
	}
}

/**
 * @typedef {PropertiesTreeView & import("../../../../../editor/src/ui/propertiesTreeView/PropertiesTreeView.js").PropertiesTreeView} MockPropertiesTreeView
 */
