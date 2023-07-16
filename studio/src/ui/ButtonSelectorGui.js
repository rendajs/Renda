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
 */
/**
 * @typedef {import("./propertiesTreeView/types.ts").GuiOptionsBase & ButtonSelectorGuiOptionsType & import("./ButtonGroup.js").ButtonGroupOptions} ButtonSelectorGuiOptions
 */

/**
 * @template {boolean} I
 * @template {import("./propertiesTreeView/types.ts").TreeViewStructureOutputPurpose} P
 * @typedef {object} ButtonSelectorGuiGetValueOptions
 * @property {I} [getIndex = false]
 * @property {P} [purpose = "default"]
 */

/**
 * @template {boolean} TAllowSelectNone
 * @typedef {TAllowSelectNone extends true ? number | null : number} IndexReturnHelper
 */

/**
 * @template {boolean} TAllowSelectNone
 * @template {boolean} [I = false]
 * @template {import("./propertiesTreeView/types.ts").TreeViewStructureOutputPurpose} [P = "default"]
 * @typedef {P extends "binarySerialization" ? IndexReturnHelper<TAllowSelectNone> :
 * 		I extends true ? IndexReturnHelper<TAllowSelectNone> :
 * 		IndexReturnHelper<TAllowSelectNone> | string} ButtonSelectorGuiGetValueReturn
 */

/** @typedef {string | number | null} ButtonSelectorGuiValueTypes */
/** @typedef {import("./propertiesTreeView/types.ts").PropertiesTreeViewEntryChangeCallback<ButtonSelectorGuiValueTypes>} OnButtonselectorGuiValueChange */

/**
 * A button group where only a single value can be selected at a time.
 * Similar to a DropDownGui but better suited for sitiuations with only a few options.
 * @template {boolean} [TAllowSelectNone = false]
 */
export class ButtonSelectorGui {
	/** @type {Button[]} */
	#buttons = [];
	/** @type {ButtonSelectorGuiOptionsItem[]} */
	#items = [];
	#buttonGroup;

	/**
	 * @param {ButtonSelectorGuiOptions} opts
	 */
	constructor({
		items = [],
		allowSelectNone = /** @type {TAllowSelectNone} */ (false),
		defaultValue = null,
		vertical = false,
		disabled = false,
	} = {}) {
		this.allowSelectNone = allowSelectNone;
		this.currentValueIndex = 0;
		this.defaultValue = this.#valueToIndex(defaultValue);
		if (!allowSelectNone && this.defaultValue == -1) {
			this.defaultValue = 0;
		}
		this.disabled = disabled;

		this.#buttonGroup = new ButtonGroup({vertical});
		this.el = this.#buttonGroup.el;

		/** @type {Set<OnButtonselectorGuiValueChange>} */
		this.onValueChangeCbs = new Set();

		this.setItems(items);
		this.setValue(this.defaultValue, {trigger: "application"});
	}

	/**
	 * Updates the list of available buttons.
	 * @param {ButtonSelectorGuiOptionsItem[]} items
	 */
	setItems(items) {
		if (items.length == 0) {
			throw new Error("An empty array was provided. ButtonSelectorGuis must at least have one item.");
		}

		for (const button of this.#buttons) {
			button.destructor();
			this.#buttonGroup.removeButton(button);
		}
		this.#buttons = [];
		this.#items = items;

		for (const [i, item] of items.entries()) {
			/** @type {import("./Button.js").ButtonGuiOptions} */
			let opts = {
				onClick: () => {
					if (this.currentValueIndex == i) {
						if (this.allowSelectNone) {
							this.setValue(null, {trigger: "user"});
						}
					} else {
						this.setValue(i, {trigger: "user"});
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
			this.#buttons.push(button);
			this.#buttonGroup.addButton(button);
		}
		this.setValue(this.allowSelectNone ? null : 0, {trigger: "application"});
	}

	#updateSelectedButton() {
		for (const [i, button] of this.#buttons.entries()) {
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
			index = this.#items.indexOf(value);
		} else {
			if (value >= 0 && value < this.#items.length) {
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
	setValue(value, {
		trigger = /** @type {import("./propertiesTreeView/types.ts").ChangeEventTriggerType} */ ("application"),
	} = {}) {
		const newValue = this.#valueToIndex(value);
		if (newValue == -1 && !this.allowSelectNone) {
			throw new Error(`"${value}" is not a valid value for this selector gui.`);
		}
		this.currentValueIndex = newValue;
		this.#updateSelectedButton();
		this.fireOnChangeCbs(trigger);
	}

	get value() {
		return this.getValue();
	}

	/**
	 * Returns the current selected button. If an array of strings was provied,
	 * returns, the string is returned. Otherwise the index of the button that
	 * is selected is returned.
	 * @template {boolean} [I = false]
	 * @template {import("./propertiesTreeView/types.ts").TreeViewStructureOutputPurpose} [P = "default"]
	 * @param {ButtonSelectorGuiGetValueOptions<I, P>} options
	 * @returns {ButtonSelectorGuiGetValueReturn<TAllowSelectNone, I, P>}
	 */
	getValue({
		getIndex = /** @type {I} */ (false),
		purpose = /** @type {P} */ ("default"),
	} = {}) {
		let returnValue;
		if (purpose == "binarySerialization") {
			getIndex = /** @type {I} */ (true);
		}
		const getNullOrIndex = () => {
			if (this.currentValueIndex == -1) return null;
			return this.currentValueIndex;
		};
		if (getIndex) {
			returnValue = getNullOrIndex();
		} else {
			const item = this.#items[this.currentValueIndex];
			if (!item) {
				returnValue = null;
			} else if (typeof item == "string") {
				returnValue = item;
			} else {
				returnValue = getNullOrIndex();
			}
		}
		return /** @type {ButtonSelectorGuiGetValueReturn<TAllowSelectNone, I, P>} */ (returnValue);
	}

	/**
	 * @param {OnButtonselectorGuiValueChange} cb
	 */
	onValueChange(cb) {
		this.onValueChangeCbs.add(cb);
	}

	/**
	 * @param {import("./propertiesTreeView/types.ts").ChangeEventTriggerType} trigger
	 */
	fireOnChangeCbs(trigger) {
		for (const cb of this.onValueChangeCbs) {
			cb({
				value: this.value,
				trigger,
			});
		}
	}
}
