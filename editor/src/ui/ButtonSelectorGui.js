import {prettifyVariableName} from "../util/util.js";
import {Button} from "./Button.js";
import {ButtonGroup} from "./ButtonGroup.js";

/**
 * @typedef {string | import("./Button.js").ButtonGuiOptions} ButtonSelectorGuiOptionsItem
 */

/**
 * @typedef ButtonSelectorGuiOptionsType
 * @property {ButtonSelectorGuiOptionsItem[]} [items]
 * @property {boolean} [allowSelectNone] Set to true to allow the user to deselect by clicking the currently selected button.
 * @property {ButtonSelectorGuiValueTypes} [defaultValue] The default value of the gui when it hasn't been modified by the user.
 *
 * @typedef {import("./propertiesTreeView/types.js").GuiOptionsBase & ButtonSelectorGuiOptionsType} ButtonSelectorGuiOptions
 */

/** @typedef {string | number | null} ButtonSelectorGuiValueTypes */
/** @typedef {(newValue: ButtonSelectorGuiValueTypes) => void} OnButtonselectorGuiValueChange */

/**
 * A button group where only a single value can be selected at a time.
 * Similar to a DropDownGui but better suited for sitiuations with only a few options.
 */
export class ButtonSelectorGui {
	/**
	 * @param {ButtonSelectorGuiOptions} opts
	 */
	constructor({
		items = [],
		allowSelectNone = false,
		defaultValue = null,
		disabled = false,
	} = {}) {
		this.items = items;
		this.allowSelectNone = allowSelectNone;
		this.currentValueIndex = 0;
		this.defaultValue = this.#valueToIndex(defaultValue);
		if (!allowSelectNone && this.defaultValue == -1) {
			this.defaultValue = 0;
		}
		this.disabled = disabled;

		this.buttonGroup = new ButtonGroup();
		this.el = this.buttonGroup.el;
		this.buttons = [];

		for (const [i, item] of items.entries()) {
			/** @type {import("./Button.js").ButtonGuiOptions} */
			let opts = {
				onClick: () => {
					if (this.currentValueIndex == i) {
						if (this.allowSelectNone) {
							this.setValue(null);
							this.fireOnChangeCbs();
						}
					} else {
						this.setValue(i);
						this.fireOnChangeCbs();
					}
				},
			};
			if (typeof item == "string") {
				opts.text = prettifyVariableName(item);
			} else {
				opts = {
					...opts,
					...item,
				};
			}
			const button = new Button(opts);
			this.buttons.push(button);
			this.buttonGroup.addButton(button);
		}

		/** @type {Set<OnButtonselectorGuiValueChange>} */
		this.onValueChangeCbs = new Set();

		this.setValue(this.defaultValue);
	}

	updateSelectedButton() {
		for (const [i, button] of this.buttons.entries()) {
			button.setSelectedHighlight(i == this.currentValueIndex);
		}
	}

	/**
	 * @param {ButtonSelectorGuiValueTypes} value
	 */
	#valueToIndex(value) {
		let index = -1;
		if (value == null) {
			index = -1;
		} else if (typeof value == "string") {
			index = this.items.indexOf(value);
		} else {
			if (value >= 0 && value < this.items.length) {
				index = value;
			} else {
				index = -1;
			}
		}
		return index;
	}

	/**
	 * @param {ButtonSelectorGuiValueTypes} value
	 */
	setValue(value) {
		const newValue = this.#valueToIndex(value);
		if (newValue == -1 && !this.allowSelectNone) {
			throw new Error(`"${value}" is not a valid value for this selector gui.`);
		}
		this.currentValueIndex = newValue;
		this.updateSelectedButton();
	}

	get value() {
		return this.getValue();
	}

	/**
	 * Returns the current selected button. If an array of strings was provied,
	 * returns, the string is returned. Otherwise the index of the button that
	 * is selected is returned.
	 */
	getValue() {
		const item = this.items[this.currentValueIndex];
		if (!item) return null;
		if (typeof item == "string") return item;
		return this.currentValueIndex;
	}

	/**
	 * @param {OnButtonselectorGuiValueChange} cb
	 */
	onValueChange(cb) {
		this.onValueChangeCbs.add(cb);
	}

	fireOnChangeCbs() {
		for (const cb of this.onValueChangeCbs) {
			cb(this.value);
		}
	}
}
