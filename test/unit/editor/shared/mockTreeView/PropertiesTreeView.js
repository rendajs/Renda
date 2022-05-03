import {spy} from "std/testing/mock";
import {PropertiesTreeViewEntry} from "./PropertiesTreeViewEntry.js";
import {TreeView} from "./TreeView.js";

export class PropertiesTreeView extends TreeView {
	constructor() {
		super();

		/** @type {import("./TreeView.js").TreeViewSpy} */
		const superSpy = this.spy;

		const generateFromSerializableStructureSpy = spy(this, "generateFromSerializableStructure");

		const newSpy = {
			...superSpy,
			generateFromSerializableStructureSpy,
		};

		/** @type {typeof newSpy} */
		this.spy = newSpy;
	}

	addCollapsable() {
		const treeView = new PropertiesTreeView();
		this.addChild(treeView);
		return treeView;
	}

	/**
	 * @param {import("../../../../../editor/src/ui/propertiesTreeView/types.js").PropertiesTreeViewEntryOptions} opts
	 */
	addItem(opts) {
		const entry = new PropertiesTreeViewEntry(opts);
		this.addChild(entry);
		return entry;
	}

	/**
	 * @param {import("../../../../../editor/src/ui/propertiesTreeView/types.js").PropertiesTreeViewStructure} structure
	 * @param {Object} [opts]
	 * @param {Object} [opts.callbacksContext]
	 */
	generateFromSerializableStructure(structure, opts) {}
}

/**
 * @template {import("../../../../../editor/src/ui/propertiesTreeView/types.js").PropertiesTreeViewStructure} Structure
 * @typedef {PropertiesTreeView & import("../../../../../editor/src/ui/propertiesTreeView/PropertiesTreeView.js").PropertiesTreeView<Structure>} MockPropertiesTreeView
 */
