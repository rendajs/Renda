import {TreeView} from "./TreeView.js";

/**
 * @typedef {Object} PropertiesTreeViewEntrySpyOnly
 * @property {unknown[][]} setValueCalls
 */

/**
 * @typedef {import("./TreeView.js").TreeViewSpy & PropertiesTreeViewEntrySpyOnly} PropertiesTreeViewEntrySpy
 */

export class PropertiesTreeViewEntry extends TreeView {
	constructor() {
		super();

		/** @type {import("./TreeView.js").TreeViewSpy} */
		const superSpy = this.spy;

		/** @type {PropertiesTreeViewEntrySpy} */
		this.spy = {
			...superSpy,
			setValueCalls: [],
		};
	}

	onValueChange() {}

	/**
	 * @param {unknown[]} args
	 */
	setValue(...args) {
		this.spy.setValueCalls.push(args);
	}
}

/**
 * @typedef {PropertiesTreeViewEntry & import("../../../../../editor/src/ui/propertiesTreeView/PropertiesTreeView.js").PropertiesTreeView} MockPropertiesTreeViewEntry
 */
