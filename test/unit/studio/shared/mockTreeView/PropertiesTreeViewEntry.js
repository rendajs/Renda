import { TreeView } from "./TreeView.js";

/**
 * @typedef {object} PropertiesTreeViewEntrySpy
 * @property {unknown[][]} setValueCalls
 * @property {import("../../../../../studio/src/ui/propertiesTreeView/types.ts").PropertiesTreeViewEntryOptions} constructorOptions
 */

/**
 * @template {import("../../../../../studio/src/ui/propertiesTreeView/types.ts").GuiTypeInstances} T
 * @typedef {object} PropertiesTreeViewEntryMockObject
 * @property {import("../../../../../studio/src/ui/propertiesTreeView/types.ts").PropertiesTreeViewEntryChangeCallback<import("../../../../../studio/src/ui/propertiesTreeView/types.ts").GetValueType<T>>} fireOnValueChangeCbs
 * @property {(value: unknown) => void} setGetValueReturn
 */

/**
 * @template {import("../../../../../studio/src/ui/propertiesTreeView/types.ts").GuiTypeInstances} [T = any]
 */
export class PropertiesTreeViewEntry extends TreeView {
	/** @typedef {import("../../../../../studio/src/ui/propertiesTreeView/types.ts").GetValueType<T>} ValueType */
	/** @typedef {(value: import("../../../../../studio/src/ui/propertiesTreeView/types.ts").PropertiesTreeViewEntryChangeCallback<ValueType>) => void} OnValueChangeCallback */

	/**
	 * @param {import("../../../../../studio/src/ui/propertiesTreeView/types.ts").PropertiesTreeViewEntryOptions} opts
	 */
	constructor(opts) {
		super();

		/** @type {PropertiesTreeViewEntrySpy} */
		this.propertiesTreeViewEntrySpy = {
			setValueCalls: [],
			constructorOptions: opts,
		};

		/** @type {PropertiesTreeViewEntryMockObject<T>} */
		this.propertiesTreeViewEntryMock = {
			/**
			 * @param {any} event
			 */
			fireOnValueChangeCbs: (event) => {
				const castEvent = /** @type {import("../../../../../studio/src/ui/propertiesTreeView/types.ts").PropertiesTreeViewEntryChangeCallback<ValueType>} */ (event);
				this.onValueChangeCbs.forEach((cb) => cb(castEvent));
			},
			/**
			 * @param {unknown} value
			 */
			setGetValueReturn: (value) => {
				this.getValueReturn = value;
				this.getValueReturnSet = true;
			},
		};

		/** @private @type {Set<OnValueChangeCallback>} */
		this.onValueChangeCbs = new Set();

		/** @private @type {unknown} */
		this.getValueReturn = null;
		/** @private */
		this.getValueReturnSet = false;

		this.gui = {};
	}

	/**
	 * @param {OnValueChangeCallback} cb
	 */
	onValueChange(cb) {
		this.onValueChangeCbs.add(cb);
	}

	/**
	 * @param {unknown[]} args
	 */
	setValue(...args) {
		this.propertiesTreeViewEntrySpy.setValueCalls.push(args);
	}

	get value() {
		return this.getValue();
	}

	getValue() {
		if (!this.getValueReturnSet) {
			throw new Error("getValue() was called before a mock value was set. Use .mock.setGetValueReturn() to set a mock value.");
		}
		return this.getValueReturn;
	}
}

/**
 * @template {import("../../../../../studio/src/ui/propertiesTreeView/types.ts").GuiTypeInstances} T
 * @typedef {PropertiesTreeViewEntry<T> & import("../../../../../studio/src/ui/propertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntry<T>} MockPropertiesTreeViewEntry
 */
