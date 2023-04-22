import {ArrayGui} from "../ArrayGui.js";
import {ObjectGui} from "../ObjectGui.js";
import {TreeView} from "../TreeView.js";
import {PropertiesTreeViewEntry} from "./PropertiesTreeViewEntry.js";

/**
 * @template {import("./types.js").PropertiesTreeViewStructure} T
 * @typedef {object} PropertiesTreeViewEventCbMapType
 * @property {import("./types.js").PropertiesTreeViewChangeEvent<T>} propertiestreeviewentryvaluechange
 */

/**
 * @template {import("./types.js").PropertiesTreeViewStructure} T
 * @typedef {PropertiesTreeViewEventCbMapType<T> & import("../TreeView.js").TreeViewEventCbMap} PropertiesTreeViewEventCbMap
 */

/**
 * @template {import("./types.js").PropertiesTreeViewStructure} [T = any]
 */
export class PropertiesTreeView extends TreeView {
	/**
	 * Creates a new PropertiesTreeView and applies the structure. This is
	 * useful if you want to create a PropertiesTreeView with the correct
	 * generic argument set automatically.
	 * @template {import("./types.js").PropertiesTreeViewStructure} T
	 * @param {T} structure
	 * @param {ConstructorParameters<typeof PropertiesTreeView>} opts
	 * @returns {PropertiesTreeView<T>}
	 */
	static withStructure(structure, ...opts) {
		const treeView = new PropertiesTreeView(...opts);
		treeView.generateFromSerializableStructure(structure);
		return /** @type {PropertiesTreeView<T>} */ (treeView);
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

		/** @type {Object<string, PropertiesTreeViewEntry<any>>} */
		this.currentSerializableStructureItems = {};

		this.registerNewEventType("propertiestreeviewentryvaluechange");
	}

	/**
	 * @param {string} [name]
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
	 * @template {import("./types.js").PropertiesTreeViewEntryOptions} T
	 * @param {T} opts
	 * @returns {import("./types.js").TreeViewEntryFactoryReturnType<T>}
	 */
	addItem(opts) {
		const item = PropertiesTreeViewEntry.of(opts);
		if (this.fullTreeDisabled) item.setDisabled(true);
		this.addChild(item);
		return item;
	}

	/**
	 * @param {function(import("./types.js").PropertiesTreeViewChangeEvent<T>) : void} cb
	 */
	onChildValueChange(cb) {
		this.addEventListener("propertiestreeviewentryvaluechange", cb);
	}

	/**
	 * @param {import("./types.js").PropertiesTreeViewStructure} structure
	 * @param {object} opts
	 * @param {object} [opts.callbacksContext]
	 */
	generateFromSerializableStructure(structure, {
		callbacksContext = {},
	} = {}) {
		this.clearChildren();
		this.currentSerializableStructureItems = {};
		for (const [key, itemSettings] of Object.entries(structure)) {
			/** @type {import("./types.js").GuiTypeOptions} */
			const guiOpts = {
				label: key,
				...itemSettings?.guiOpts,
			};
			const options = {
				...itemSettings,
				guiOpts,
				callbacksContext,
			};
			const castOptions = /** @type {import("./types.js").PropertiesTreeViewEntryOptions} */ (options);
			const addedItem = this.addItem(castOptions);
			this.currentSerializableStructureItems[key] = addedItem;
		}
	}

	/**
	 * @param {import("./types.js").StructureToSetObject<T>} values
	 * @param {import("./types.js").AllPossibleSetValueOpts} [setValueOpts]
	 */
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
	 * @template {import("./types.js").PropertiesTreeViewStructure} TStructure
	 * @template {import("./types.js").AllPossibleGetValueOpts} [TGuiOpts = {}]
	 * @param {TStructure} structure
	 * @param {TGuiOpts} [guiOpts]
	 * @returns {import("./types.js").GetStructureValuesReturnType<TStructure, TGuiOpts>}
	 */
	getSerializableStructureValues(structure, guiOpts) {
		const purpose = guiOpts?.purpose ?? "default";
		let stripDefaultValues = guiOpts?.stripDefaultValues ?? false;
		if (purpose == "fileStorage") {
			stripDefaultValues = true;
		} else if (purpose == "binarySerialization") {
			stripDefaultValues = false;
		}
		/** @type {Object<string, unknown>} */
		const values = {};
		let i = 0;
		let hasSetOneValue = false;
		for (const key of Object.keys(structure)) {
			const entry = this.children[i++];
			if (entry instanceof PropertiesTreeViewEntry) {
				const castEntry = /** @type {PropertiesTreeViewEntry<import("./types.js").GuiTypeInstances>} */ (entry);
				if (!castEntry.omitFromSerializableStuctureValues(guiOpts)) {
					values[key] = castEntry.getValue(guiOpts);
					hasSetOneValue = true;
				}
			}
		}
		if (stripDefaultValues && !hasSetOneValue) return /** @type {import("./types.js").GetStructureValuesReturnType<TStructure, TGuiOpts>} */ (undefined);
		return /** @type {import("./types.js").GetStructureValuesReturnType<TStructure, TGuiOpts>} */ (values);
	}

	/**
	 * @template {keyof T} TKey
	 * @param {TKey} key
	 * @returns {import("./types.js").GetSerializableStructureEntryReturn<T, TKey>}
	 */
	getSerializableStructureEntry(key) {
		const castKey = /** @type {string} */ (key);
		return this.currentSerializableStructureItems[castKey];
	}

	/**
	 * @param {PropertiesTreeViewEntry<any>} treeViewEntry
	 */
	getSerializableStructureKeyForEntry(treeViewEntry) {
		for (const [key, entry] of Object.entries(this.currentSerializableStructureItems)) {
			if (treeViewEntry == entry) {
				return key;
			}
		}
		return null;
	}

	/**
	 * @param {boolean} disabled
	 */
	setFullTreeDisabled(disabled) {
		this.fullTreeDisabled = disabled;
		for (const child of this.children) {
			if (child instanceof PropertiesTreeViewEntry) {
				child.setDisabled(disabled);
			}
		}
	}

	/**
	 * Similar to {@linkcode traverseDown} except that the yielded values are guaranteed to be a {@linkcode PropertiesTreeViewEntry}.
	 * If an entry is of type array or object, the children of that entry are also traversed.
	 * @returns {Generator<import("./PropertiesTreeViewEntry.js").PropertiesTreeViewEntryAny>}
	 */
	*traverseDownEntries() {
		for (const entry of this.children) {
			if (entry instanceof PropertiesTreeViewEntry) {
				const castEntry = /** @type {import("./PropertiesTreeViewEntry.js").PropertiesTreeViewEntryAny} */ (entry);
				yield castEntry;
				if (castEntry.gui instanceof ArrayGui) {
					for (const child of castEntry.gui.valueItems) {
						yield child;
					}
				} else if (castEntry.gui instanceof ObjectGui) {
					yield* castEntry.gui.treeView.traverseDownEntries();
				}
			}
		}
	}

	/**
	 * @template {keyof PropertiesTreeViewEventCbMap<T>} E
	 * @param {E} eventType The identifier of the event type.
	 * @param {function(PropertiesTreeViewEventCbMap<T>[E]) : void} cb The callback to invoke when the event occurs.
	 */
	addEventListener(eventType, cb) {
		// @ts-ignore
		// eslint-disable-next-line prefer-rest-params
		super.addEventListener(...arguments);
	}

	/**
	 * @template {keyof PropertiesTreeViewEventCbMap<T>} E
	 * @param {E} eventType The identifier of the event type.
	 * @param {function(PropertiesTreeViewEventCbMap<T>[E]) : void} cb The callback to remove.
	 */
	removeEventListener(eventType, cb) {
		// @ts-ignore
		// eslint-disable-next-line prefer-rest-params
		super.removeEventListener(...arguments);
	}

	/**
	 * Fires an event on this TreeView and its parents.
	 * @template {keyof PropertiesTreeViewEventCbMap<T>} E
	 * @param {E} eventType The identifier of the event type.
	 * @param {PropertiesTreeViewEventCbMap<T>[E]} event The data to pass to the event callbacks.
	 */
	fireEvent(eventType, event) {
		// @ts-ignore
		// eslint-disable-next-line prefer-rest-params
		super.fireEvent(...arguments);
	}
}
