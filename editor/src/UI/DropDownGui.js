import {prettifyVariableName} from "../Util/Util.js";

/**
 * @typedef {Object} DropDownGuiOptionsType
 * @property {string[]} [items]
 * @property {Object.<string, number>?} [enumObject]
 * @property {string | number} [defaultValue = null] The default value of the gui when it hasn't been modified by the user.
 *
 * @typedef {import("./PropertiesTreeView/PropertiesTreeViewEntry.js").GuiOptions & DropDownGuiOptionsType} DropDownGuiOptions
 */

export class DropDownGui {
	/**
	 * @param {DropDownGuiOptions} opts
	 */
	constructor({
		items = [],
		defaultValue = null,
		enumObject = null,
		disabled = false,
	} = {}) {
		this.items = items;
		this.itemTexts = [...items];
		this.defaultValue = defaultValue;
		this.disabled = disabled;
		this.enumObject = enumObject;
		/** @type {Object.<number, string>?} */
		this.inverseEnumObject = null;

		this.el = document.createElement("select");
		this.el.classList.add("textGui", "buttonLike", "resetInput", "textInput");

		this.onValueChangeCbs = new Set();
		this.boundFireOnChangeCbs = this.fireOnChangeCbs.bind(this);
		this.el.addEventListener("change", this.boundFireOnChangeCbs);
		if (enumObject) this.setEnumObject(enumObject);
		this.setValue(defaultValue);
		this.setDisabled(disabled);

		this.updateOptions();
	}

	destructor() {
		this.el.removeEventListener("change", this.boundFireOnChangeCbs);
	}

	/**
	 * @param {string[]} items
	 */
	setItems(items) {
		this.items = [...items];
		this.itemTexts = [...items];
		this.updateOptions();
	}

	/**
	 * @param {Object.<string, number>} enumObject
	 */
	setEnumObject(enumObject) {
		this.enumObject = enumObject;
		this.inverseEnumObject = null;
		if (this.enumObject) {
			this.inverseEnumObject = {};
			this.items = [];
			this.itemTexts = [];
			for (const [key, value] of Object.entries(this.enumObject)) {
				this.inverseEnumObject[value] = key;
				this.items.push(key);
				this.itemTexts.push(prettifyVariableName(key));
			}
		}
		this.updateOptions();
	}

	updateOptions() {
		const oldValue = this.getValue();
		// Clear existing options
		while (this.el.firstChild) {
			this.el.removeChild(this.el.firstChild);
		}

		// Add new options
		for (const [i, option] of this.itemTexts.entries()) {
			const optionEl = document.createElement("option");
			optionEl.value = String(i);
			optionEl.textContent = option;
			this.el.appendChild(optionEl);
		}

		this.setValue(oldValue);
	}

	/**
	 * If an enumObject is set, you can pass either the string representation of the enumObject or the number.
	 * If no enumObject is set, you can pass either the index or the value of the dropdown items.
	 * @param {number | string} value
	 */
	setValue(value) {
		if (this.enumObject && this.inverseEnumObject) {
			if (typeof value != "string") {
				value = this.inverseEnumObject[value];
			}
			const index = this.items.indexOf(value);
			if (index >= 0) {
				this.el.selectedIndex = index;
			} else {
				// todo: If an option exist without a value, it will be selected
				// here, instead we want to generate a value that does not exist
				// in the options list.
				this.el.value = "";
			}
		} else {
			if (typeof value == "number") {
				this.el.selectedIndex = value;
			} else {
				this.el.selectedIndex = this.items.indexOf(value);
			}
		}
	}

	/** @typedef {import("./PropertiesTreeView/PropertiesTreeView.js").SerializableStructureOutputPurpose} SerializableStructureOutputPurpose */

	/**
	 * @template {boolean} T
	 * @template {SerializableStructureOutputPurpose} U
	 * @typedef {Object} GetValueOptions
	 * @property {T} [getAsString = true] If an enumObject is set, this controls whether the number or string of
	 * the enumObject is returned. If no enumObject is set, this controls whether the index or the value of the
	 * dropdown items is returned.
	 * @property {U} [purpose = "default"]
	 */

	/**
	 * @template {boolean} T
	 * @template {SerializableStructureOutputPurpose} U
	 * @typedef {U extends "fileStorage" ? string :
	 * U extends "binaryComposer" ? number :
	 * U extends "default" | undefined ? (
	 *   T extends true ? string :
	 *   T extends false ? number :
	 *   T extends undefined ? string :
	 *   number
	 * ) : string} GetValueReturn
	 */

	/**
	 * @template {boolean} [T = true]
	 * @template {SerializableStructureOutputPurpose} [U = "default"]
	 * @param {GetValueOptions<T, U>} opts
	 * @returns {GetValueReturn<T, U>}
	 */
	getValue({
		getAsString = /** @type {T} */ (true),
		purpose = /** @type {U} */ ("default"),
	} = {}) {
		let getAsStringValue = /** @type {boolean} */ (getAsString);
		if (purpose == "fileStorage") {
			getAsStringValue = true;
		} else if (purpose == "binaryComposer") {
			getAsStringValue = false;
		}

		let returnValue;
		if (this.enumObject) {
			const enumObjectStrValue = this.items[this.el.selectedIndex];
			if (getAsStringValue) {
				returnValue = enumObjectStrValue;
			} else {
				returnValue = this.enumObject[enumObjectStrValue];
			}
		} else {
			if (getAsStringValue) {
				returnValue = this.items[this.el.selectedIndex];
			} else {
				returnValue = this.el.selectedIndex;
			}
		}
		return /** @type {GetValueReturn<T, U>} */ (returnValue);
	}

	get value() {
		return this.getValue();
	}

	/**
	 * @param {number | string} value
	 */
	set value(value) {
		this.setValue(value);
	}

	/**
	 * @param {(selectedIndex: string) => void} cb
	 */
	onValueChange(cb) {
		this.onValueChangeCbs.add(cb);
	}

	fireOnChangeCbs() {
		for (const cb of this.onValueChangeCbs) {
			cb(this.value);
		}
	}

	/**
	 * @param {boolean} disabled
	 */
	setDisabled(disabled) {
		this.disabled = disabled;
		this.el.disabled = disabled;
	}
}
