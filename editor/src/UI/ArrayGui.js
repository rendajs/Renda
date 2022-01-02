import {PropertiesTreeView} from "./PropertiesTreeView/PropertiesTreeView.js";
import {ButtonGroup} from "../UI/ButtonGroup.js";
import {Button} from "./Button.js";

/**
 * @template T
 * @typedef {T extends keyof import("./PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewGuiOptionsMap ? {
 * value?: any[],
 * arrayType: T,
 * arrayGuiOpts?: import("./PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewGuiOptionsMap[T],
 * } : never} ArrayGuiOptionsTypeGeneric
 */

/** @typedef {ArrayGuiOptionsTypeGeneric<keyof import("./PropertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewGuiOptionsMap>} ArrayGuiOptionsType */
/** @typedef {import("./PropertiesTreeView/PropertiesTreeViewEntry.js").GuiOptions & ArrayGuiOptionsType} ArrayGuiOptions */

export class ArrayGui {
	/**
	 * @param {ArrayGuiOptions} options
	 */
	constructor({
		defaultValue = [],
		arrayType = "number",
		arrayGuiOpts = {},
		disabled = false,
	} = {}) {
		this.disabled = false;

		this.el = document.createElement("div");
		this.el.classList.add("arrayGui");

		this.valueItems = [];
		this.type = arrayType;
		this.arrayGuiOpts = arrayGuiOpts;
		this.onValueChangeCbs = [];

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
		this.el = null;
	}

	// adds new item to the end of the array
	addItem(extraArrayOpts = {}) {
		const index = this.value.length;
		const addedItem = this.treeView.addItem({
			type: this.type,
			guiOpts: {
				smallLabel: true,
				label: String(index),
				...this.arrayGuiOpts,
				...extraArrayOpts,
			},
		});
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

	setValue(value, setValueOpts) {
		if (!value) value = [];
		const removeCount = this.valueItems.length - value.length;
		if (removeCount > 0) {
			for (let i = 0; i < removeCount; i++) {
				this.removeItem();
			}
		}
		for (const [i, item] of value.entries()) {
			const newSetValueOpts = {
				...setValueOpts,
				setOnObject: value,
				setOnObjectKey: i,
			};
			if (this.valueItems.length <= i) {
				const addedItem = this.addItem();
				addedItem.setValue(item, newSetValueOpts);
			} else {
				this.valueItems[i].setValue(item, newSetValueOpts);
			}
		}
	}

	getValue(guiOpts) {
		const valueArray = [];
		for (const item of this.valueItems) {
			let value = null;
			if (item.gui.getValue) {
				value = item.gui.getValue(guiOpts);
			} else {
				value = item.gui.value;
			}
			valueArray.push(value);
		}
		return valueArray;
	}

	get value() {
		return this.getValue();
	}

	onValueChange(cb) {
		this.onValueChangeCbs.push(cb);
	}

	fireValueChange() {
		for (const cb of this.onValueChangeCbs) {
			cb(this.value);
		}
	}

	setDisabled(disabled) {
		this.disabled = disabled;
		for (const item of this.valueItems) {
			item.setDisabled(disabled);
		}
		this.addItemButton.setDisabled(disabled);
		this.removeItemButton.setDisabled(disabled);
	}
}
