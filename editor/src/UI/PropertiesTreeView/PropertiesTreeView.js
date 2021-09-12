import TreeView from "../TreeView.js";
import PropertiesTreeViewEntry from "./PropertiesTreeViewEntry.js";

/**
 * `"default"` uses the default behaviour of PropertiesTreeViewEntries
 * `"fileStorage"` optimizes for data stored as json in project asset files
 * `"binaryComposer"` optimizes for data passed to BinaryComposer.objectToBinary
 * `"script"` optimizes for how in game scripts are most likely to access the data (e.g. Entity Components)
 * @typedef {"default" | "fileStorage" | "binaryComposer" | "script"} SerializableStructureOutputPurpose
 */

/**
 * @typedef {Object.<string, import("./PropertiesTreeViewEntry.js").PropertiesTreeViewEntryOptions>} PropertiesTreeViewStructure
 */

export default class PropertiesTreeView extends TreeView {
	constructor({
		rowVisible = false,
		name = "",
	} = {}) {
		super({
			name,
			selectable: false,
			rowVisible,
		});
		this.fullTreeDisabled = false;

		/** @type {Object.<string, PropertiesTreeViewEntry>} */
		this.currentSerializableStructureItems = null;

		this.registerNewEventType("treeViewEntryValueChange");
	}

	addCollapsable(name) {
		const newTreeView = new PropertiesTreeView({
			rowVisible: true,
			name,
		});
		this.addChild(newTreeView);
		return newTreeView;
	}

	/**
	 * @param {import("./PropertiesTreeViewEntry.js").PropertiesTreeViewEntryOptions} opts
	 * @returns {PropertiesTreeViewEntry}
	 */
	addItem(opts) {
		const item = new PropertiesTreeViewEntry(opts);
		if (this.fullTreeDisabled) item.setDisabled(true);
		this.addChild(item);
		return item;
	}

	/**
	 * @param {function(import("./PropertiesTreeViewEntry.js").PropertiesTreeViewChangeEvent) : void} cb
	 */
	onChildValueChange(cb) {
		this.addEventListener("treeViewEntryValueChange", cb);
	}

	/**
	 * @param {PropertiesTreeViewStructure} structure
	 * @param {Object} opts
	 * @param {Object} [opts.callbacksContext = {}]
	 */
	generateFromSerializableStructure(structure, {
		callbacksContext = {},
	} = {}) {
		this.clearChildren();
		this.currentSerializableStructureItems = {};
		for (const [key, itemSettings] of Object.entries(structure)) {
			const guiOpts = {
				label: key,
				...itemSettings?.guiOpts,
			};
			const addedItem = this.addItem({
				...itemSettings,
				guiOpts,
				callbacksContext,
			});
			this.currentSerializableStructureItems[key] = addedItem;
		}
	}

	fillSerializableStructureValues(values, setValueOpts) {
		if (!values) return;
		for (const [key, value] of Object.entries(values)) {
			const item = this.currentSerializableStructureItems[key];
			const newSetValueOpts = {
				...setValueOpts,
				setOnObject: values,
				setOnObjectKey: key,
			};
			item?.setValue(value, newSetValueOpts);
		}
	}

	/**
	 * @param {Object} [guiOpts]
	 * @param {SerializableStructureOutputPurpose} [guiOpts.purpose = "default"]
	 * @param {boolean} [guiOpts.stripDefaultValues = false]
	 * @returns
	 */
	getSerializableStructureValues(structure, guiOpts) {
		let {
			purpose = "default",
			stripDefaultValues = false,
		} = guiOpts || {};
		if (purpose == "fileStorage") {
			stripDefaultValues = true;
		} else if (purpose == "binaryComposer") {
			stripDefaultValues = false;
		}
		const values = {};
		let i = 0;
		let hasSetOneValue = false;
		for (const key of Object.keys(structure)) {
			const entry = this.children[i++];
			if (!entry.omitFromSerializableStuctureValues(guiOpts)) {
				values[key] = entry.getValue(guiOpts);
				hasSetOneValue = true;
			}
		}
		if (stripDefaultValues && !hasSetOneValue) return undefined;
		return values;
	}

	getSerializableStructureEntry(key) {
		return this.currentSerializableStructureItems[key];
	}

	getSerializableStructureKeyForEntry(treeViewEntry) {
		for (const [key, entry] of Object.entries(this.currentSerializableStructureItems)) {
			if (treeViewEntry == entry) {
				return key;
			}
		}
		return null;
	}

	setFullTreeDisabled(disabled) {
		this.fullTreeDisabled = disabled;
		for (const child of this.children) {
			child.setDisabled(disabled);
		}
	}
}
