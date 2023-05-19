import {spy} from "std/testing/mock.ts";
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
	 * @param {import("../../../../../studio/src/ui/propertiesTreeView/types.ts").PropertiesTreeViewEntryOptions} opts
	 */
	addItem(opts) {
		const entry = new PropertiesTreeViewEntry(opts);
		this.addChild(entry);
		return entry;
	}

	/**
	 * @param {import("../../../../../studio/src/ui/propertiesTreeView/types.ts").PropertiesTreeViewStructure} structure
	 * @param {object} [opts]
	 * @param {object} [opts.callbacksContext]
	 */
	generateFromSerializableStructure(structure, opts) {}

	/**
	 * @param {import("../../../../../studio/src/ui/propertiesTreeView/types.ts").StructureToSetObject<any>} values
	 * @param {import("../../../../../studio/src/ui/propertiesTreeView/types.ts").AllPossibleSetValueOpts} [setValueOpts]
	 */
	fillSerializableStructureValues(values, setValueOpts) {}
}

/**
 * @template {import("../../../../../studio/src/ui/propertiesTreeView/types.ts").PropertiesTreeViewStructure} Structure
 * @typedef {PropertiesTreeView & import("../../../../../studio/src/ui/propertiesTreeView/PropertiesTreeView.js").PropertiesTreeView<Structure>} MockPropertiesTreeView
 */
