import {TreeView} from "./TreeView.js";

/**
 * @typedef {Object} PropertiesTreeViewEntrySpyOnly
 * @property {unknown[][]} setValueCalls
 */
/**
 * @typedef {import("./TreeView.js").TreeViewSpy & PropertiesTreeViewEntrySpyOnly} PropertiesTreeViewEntrySpy
 */

/**
 * @template {import("../../../../../editor/src/ui/propertiesTreeView/types.js").GuiTypeInstances} T
 * @typedef {Object} PropertiesTreeViewEntryMockObjectOnly
 * @property {(value: import("../../../../../editor/src/ui/propertiesTreeView/types.js").GetValueType<T>) => void} fireOnValueChangeCbs
 * @property {(value: unknown) => void} setGetValueReturn
 */
/**
 * @template {import("../../../../../editor/src/ui/propertiesTreeView/types.js").GuiTypeInstances} T
 * @typedef {import("./TreeView.js").TreeViewMockObject & PropertiesTreeViewEntryMockObjectOnly<T>} PropertiesTreeViewEntryMockObject
 */

/**
 * @template {import("../../../../../editor/src/ui/propertiesTreeView/types.js").GuiTypeInstances} [T = any]
 */
export class PropertiesTreeViewEntry extends TreeView {
	/** @typedef {import("../../../../../editor/src/ui/propertiesTreeView/types.js").GetValueType<T>} ValueType */
	/** @typedef {(value: ValueType) => void} OnValueChangeCallback */
	constructor() {
		super();

		/** @type {import("./TreeView.js").TreeViewSpy} */
		const superSpy = this.spy;
		/** @type {PropertiesTreeViewEntrySpy} */
		this.spy = {
			...superSpy,
			setValueCalls: [],
		};

		/** @type {import("./TreeView.js").TreeViewMockObject} */
		const superMock = this.mock;
		/** @type {PropertiesTreeViewEntryMockObject<T>} */
		this.mock = {
			...superMock,
			/**
			 * @param {ValueType} value
			 */
			fireOnValueChangeCbs: value => {
				this.onValueChangeCbs.forEach(cb => cb(value));
			},
			/**
			 * @param {unknown} value
			 */
			setGetValueReturn: value => {
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
		this.spy.setValueCalls.push(args);
	}

	getValue() {
		if (!this.getValueReturnSet) {
			throw new Error("getValue() was called before a mock value was set. Use .mock.setGetValueReturn() to set a mock value.");
		}
		return this.getValueReturn;
	}
}

/**
 * @template {import("../../../../../editor/src/ui/propertiesTreeView/types.js").GuiTypeInstances} T
 * @typedef {PropertiesTreeViewEntry<T> & import("../../../../../editor/src/ui/propertiesTreeView/PropertiesTreeView.js").PropertiesTreeView<T>} MockPropertiesTreeViewEntry
 */
