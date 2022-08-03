import {PropertiesTreeView} from "./propertiesTreeView/PropertiesTreeView.js";
import {ButtonGroup} from "./ButtonGroup.js";
import {Button} from "./Button.js";

/**
 * @template {import("./propertiesTreeView/types.js").GuiTypes} T
 * @typedef {T extends import("./propertiesTreeView/types.js").GuiTypes ?
 * 	{
 * 		arrayType: T,
 * 		arrayGuiOpts?: import("./propertiesTreeView/types.js").GetGuiOptions<T>,
 * 		value?: any[],
 * 	} :
 * never} ArrayGuiOptionsType
 */
/**
 * @template {import("./propertiesTreeView/types.js").GuiTypes} T
 * @typedef {import("./propertiesTreeView/types.js").GuiOptionsBase & ArrayGuiOptionsType<T>} ArrayGuiOptions
 */

/**
 * @template TOpts
 * @typedef {TOpts extends ArrayGuiOptions<import("./propertiesTreeView/types.js").GuiTypes> ? ArrayGui<TOpts> : never} GetArrayGuiForOptions
 */

/**
 * @template TObjectGuiInstance
 * @template TOpts
 * @template {import("./propertiesTreeView/types.js").RecursionLimitNumbers} [TRecursionLimit = import("./propertiesTreeView/types.js").DefaultRecursionLimit]
 * @typedef {TObjectGuiInstance extends ArrayGui<infer TStructure, 3> ?
 * 		import("./propertiesTreeView/types.js").GetArrayStructureValuesReturnType<TStructure, TOpts, TRecursionLimit> :
 * 		never} GetArrayGuiValueTypeForOptions
 */

/**
 * @template {ArrayGuiOptions<import("./propertiesTreeView/types.js").GuiTypes>} T
 * @template {import("./propertiesTreeView/types.js").RecursionLimitNumbers} [TRecursionLimit = import("./propertiesTreeView/types.js").DefaultRecursionLimit]
 */
export class ArrayGui {
	/**
	 * @typedef {(value: import("./propertiesTreeView/types.js").GetArrayStructureValuesReturnType<T, {}, TRecursionLimit>) => void} OnValueChangeCallback
	 */

	/**
	 * @param {T} options
	 */
	constructor({
		defaultValue = [],
		arrayType,
		arrayGuiOpts = {},
		disabled = false,
	}) {
		this.disabled = false;

		this.el = document.createElement("div");
		this.el.classList.add("arrayGui");

		/** @type {import("./propertiesTreeView/types.js").GetArrayValueItemType<T>[]} */
		this.valueItems = [];
		this.type = arrayType;
		this.arrayGuiOpts = arrayGuiOpts;
		/** @type {Set<OnValueChangeCallback>} */
		this.onValueChangeCbs = new Set();

		this.addRemoveButtonGroup = new ButtonGroup();
		this.el.appendChild(this.addRemoveButtonGroup.el);
		this.removeItemButton = new Button({
			text: "-",
			onClick: () => {
				// todo: add support for removing selected entry
				this.removeItem();
			},
		});
		this.addRemoveButtonGroup.addButton(this.removeItemButton);
		this.addItemButton = new Button({
			text: "+",
			onClick: () => {
				this.addItem();
			},
		});
		this.addRemoveButtonGroup.addButton(this.addItemButton);

		this.treeView = new PropertiesTreeView();
		this.el.appendChild(this.treeView.el);

		this.setValue(defaultValue);
		if (disabled) this.setDisabled(true);
	}

	destructor() {
		if (this.el.parentElement) {
			this.el.parentElement.removeChild(this.el);
		}
	}

	// adds new item to the end of the array
	addItem(extraArrayOpts = {}) {
		const index = this.value.length;
		/** @type {import("./propertiesTreeView/types.js").PropertiesTreeViewEntryOptionsGeneric<any>} */
		const addItemOpts = {
			type: this.type,
			guiOpts: {
				smallLabel: true,
				label: String(index),
				...this.arrayGuiOpts,
				...extraArrayOpts,
			},
		};
		const addedItem = this.treeView.addItem(addItemOpts);
		addedItem.onValueChange(() => {
			this.fireValueChange();
		});
		if (this.disabled) addedItem.setDisabled(true);
		this.valueItems.push(addedItem);
		this.fireValueChange();
		return addedItem;
	}

	// remove array item by index, counts from the back when negative
	removeItem(index = -1) {
		if (index < 0) index = this.valueItems.length + index;

		if (index < 0 || index >= this.valueItems.length) {
			throw new Error(`Failed to remove array item, index ${index} does not exist`);
		}
		this.treeView.removeChildIndex(index);
		this.valueItems.splice(index, 1);
		this.fireValueChange();
	}

	/**
	 * @param {import("./propertiesTreeView/types.js").ArrayStructureToSetObject<T>} value
	 * @param {import("./propertiesTreeView/types.js").AllPossibleSetValueOpts} [setValueOpts]
	 */
	setValue(value, setValueOpts) {
		if (!value) value = [];
		const removeCount = this.valueItems.length - value.length;
		if (removeCount > 0) {
			for (let i = 0; i < removeCount; i++) {
				this.removeItem();
			}
		}
		const castValueAny = /** @type {any[]} */ (value);
		for (const [i, item] of castValueAny.entries()) {
			/** @type {import("./propertiesTreeView/types.js").BaseSetValueOptions} */
			const newSetValueOpts = {
				...setValueOpts,
				setOnObject: value,
				setOnObjectKey: i,
			};
			if (this.valueItems.length <= i) {
				const addedItem = this.addItem();
				addedItem.setValue(item, newSetValueOpts);
			} else {
				const gui = /** @type {import("./propertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntry<any>} */ (this.valueItems[i]);
				gui.setValue(item, newSetValueOpts);
			}
		}
	}

	/**
	 * @template {import("./propertiesTreeView/types.js").AllPossibleGetValueOpts} [TGuiOpts = {}]
	 * @param {TGuiOpts} [guiOpts]
	 * @returns {import("./propertiesTreeView/types.js").GetArrayStructureValuesReturnType<T, TGuiOpts, TRecursionLimit>}
	 */
	getValue(guiOpts) {
		const valueArray = [];
		for (const item of this.valueItems) {
			let value = null;
			const gui = /** @type {import("./propertiesTreeView/PropertiesTreeViewEntry.js").GuiInterface} */ (item.gui);
			if (gui.getValue) {
				value = gui.getValue(guiOpts);
			} else {
				value = gui.value;
			}
			valueArray.push(value);
		}
		return valueArray;
	}

	get value() {
		return this.getValue();
	}

	/**
	 * @param {OnValueChangeCallback} cb
	 */
	onValueChange(cb) {
		this.onValueChangeCbs.add(cb);
	}

	fireValueChange() {
		this.onValueChangeCbs.forEach(cb => cb(this.value));
	}

	/**
	 * @param {boolean} disabled
	 */
	setDisabled(disabled) {
		this.disabled = disabled;
		for (const item of this.valueItems) {
			item.setDisabled(disabled);
		}
		this.addItemButton.setDisabled(disabled);
		this.removeItemButton.setDisabled(disabled);
	}
}
