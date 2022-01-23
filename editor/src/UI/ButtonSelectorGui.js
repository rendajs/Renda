import {prettifyVariableName} from "../util/util.js";
import {Button} from "./Button.js";
import {ButtonGroup} from "./ButtonGroup.js";

/**
 * @typedef {Object} ButtonSelectorGuiOptionsType
 * @property {string[]} [items]
 * @property {boolean} [allowSelectNone] Set to true to allow the user to deselect by clicking the currently selected button.
 * @property {string} [defaultValue = null] The default value of the gui when it hasn't been modified by the user.
 *
 * @typedef {import("./propertiesTreeView/types.js").GuiOptionsBase & ButtonSelectorGuiOptionsType} ButtonSelectorGuiOptions
 */

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
		this.defaultValue = defaultValue;
		this.disabled = disabled;

		this.buttonGroup = new ButtonGroup();
		this.el = this.buttonGroup.el;
		this.buttons = [];

		for (const item of items) {
			const button = new Button({
				text: prettifyVariableName(item),
				onClick: () => {
					if (this.value == item) {
						if (this.allowSelectNone) {
							this.setValue(null);
							this.fireOnChangeCbs();
						}
					} else {
						this.setValue(item);
						this.fireOnChangeCbs();
					}
				},
			});
			this.buttons.push(button);
			this.buttonGroup.addButton(button);
		}

		/** @type {Set<(newValue: string) => void>} */
		this.onValueChangeCbs = new Set();

		this.setValue(defaultValue);
	}

	updateSelectedButton() {
		for (const [i, button] of this.buttons.entries()) {
			button.setSelectedHighlight(i == this.currentValueIndex);
		}
	}

	/**
	 * @param {string?} value
	 */
	setValue(value) {
		if (value == null) {
			this.currentValueIndex = -1;
		} else {
			this.currentValueIndex = this.items.indexOf(value);
		}
		if (this.currentValueIndex == -1 && !this.allowSelectNone) {
			this.currentValueIndex = 0;
		}
		this.updateSelectedButton();
	}

	get value() {
		return this.getValue();
	}

	getValue() {
		return this.items[this.currentValueIndex] ?? null;
	}

	/**
	 * @param {(newValue: string) => void} cb
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
