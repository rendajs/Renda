import {TreeView} from "../TreeView.js";
import {PropertiesTreeViewEntry} from "./PropertiesTreeViewEntry.js";

/**
 * `"default"` uses the default behaviour of PropertiesTreeViewEntries
 * `"fileStorage"` optimizes for data stored as json in project asset files
 * `"binaryComposer"` optimizes for data passed to BinaryComposer.objectToBinary
 * `"script"` optimizes for how in game scripts are most likely to access the data (e.g. Entity Components).
 * @typedef {"default" | "fileStorage" | "binaryComposer" | "script"} SerializableStructureOutputPurpose
 */

/**
 * @typedef {Object} PropertiesTreeViewEventCbMapType
 * @property {import("./types.js").PropertiesTreeViewChangeEvent} propertiestreeviewentryvaluechange
 *
 * @typedef {PropertiesTreeViewEventCbMapType & import("../TreeView.js").TreeViewEventCbMap} PropertiesTreeViewEventCbMap
 */

/**
 * @template T
 */
export class PropertiesTreeView extends TreeView {
	/**
	 * Creates a new PropertiesTreeView and applies the structure. This is
	 * useful if you want to create a PropertiesTreeView with the correct
	 * generic argument set automatically.
	 * @template {import("./types.js").PropertiesTreeViewStructure} T
	 * @param {T} structure
	 * @param {ConstructorParameters<typeof PropertiesTreeView>} opts
	 */
	static withStructure(structure, ...opts) {
		const treeView = new PropertiesTreeView(...opts);
		treeView.generateFromSerializableStructure(structure);
		return /** @type {PropertiesTreeView<import("./types.js").StructureToObject<T>>} */ (treeView);
	}

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

		this.registerNewEventType("propertiestreeviewentryvaluechange");
	}

	/**
	 * @param {string} [name]
	 * @returns {PropertiesTreeView}
	 */
	addCollapsable(name = "") {
		const newTreeView = new PropertiesTreeView({
			rowVisible: true,
			name,
		});
		this.addChild(newTreeView);
		return newTreeView;
	}

	/**
	 * @template {import("./types.js").GuiTypes} T
	 * @param {import("./types.js").PropertiesTreeViewEntryOptionsGeneric<T>} opts
	 */
	addItem(opts) {
		const item = PropertiesTreeViewEntry.of(opts);
		if (this.fullTreeDisabled) item.setDisabled(true);
		this.addChild(item);
		return item;
	}

	/**
	 * @param {function(import("./types.js").PropertiesTreeViewChangeEvent) : void} cb
	 */
	onChildValueChange(cb) {
		this.addEventListener("propertiestreeviewentryvaluechange", cb);
	}

	/**
	 * @param {import("./types.js").PropertiesTreeViewStructure} structure
	 * @param {Object} opts
	 * @param {Object} [opts.callbacksContext]
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

	// Todo: get rid of the structure param, the structure should be remembered
	// when setting via generateFromSerializableStructure
	/**
	 * @template {import("./types.js").PropertiesTreeViewStructure} TStructure
	 * @template {import("./types.js").AllPossibleGuiOpts} [TGuiOpts = {}]
	 * @param {TStructure} structure
	 * @param {TGuiOpts} [guiOpts]
	 * @returns {import("./types.js").StructureToObject<TStructure, TGuiOpts>}
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

	/**
	 * @template {keyof PropertiesTreeViewEventCbMap} T
	 * @param {T} eventType The identifier of the event type.
	 * @param {function(PropertiesTreeViewEventCbMap[T]) : void} cb The callback to invoke when the event occurs.
	 */
	addEventListener(eventType, cb) {
		// @ts-ignore
		// eslint-disable-next-line prefer-rest-params
		super.addEventListener(...arguments);
	}

	/**
	 * @template {keyof PropertiesTreeViewEventCbMap} T
	 * @param {T} eventType The identifier of the event type.
	 * @param {function(PropertiesTreeViewEventCbMap[T]) : void} cb The callback to remove.
	 */
	removeEventListener(eventType, cb) {
		// @ts-ignore
		// eslint-disable-next-line prefer-rest-params
		super.removeEventListener(...arguments);
	}

	/**
	 * Fires an event on this TreeView and its parents.
	 * @template {keyof PropertiesTreeViewEventCbMap} T
	 * @param {T} eventType The identifier of the event type.
	 * @param {PropertiesTreeViewEventCbMap[T]} event The data to pass to the event callbacks.
	 */
	fireEvent(eventType, event) {
		// @ts-ignore
		// eslint-disable-next-line prefer-rest-params
		super.fireEvent(...arguments);
	}
}
