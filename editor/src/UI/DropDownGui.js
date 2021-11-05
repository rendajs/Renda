import {prettifyVariableName} from "../Util/Util.js";

/**
 * @typedef {Object} DropDownGuiOptionsType
 * @property {string[]} [items]
 * @property {Object.<string, number>} [enumObject]
 * @property {string | number} [defaultValue = null] The default value of the gui when it hasn't been modified by the user.
 *
 * @typedef {import("./PropertiesTreeView/PropertiesTreeViewEntry.js").GuiOptions & DropDownGuiOptionsType} DropDownGuiOptions
 */

export default class DropDownGui {
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
		/** @type {Object.<number, string>} */
		this.inverseEnumObject = null;

		this.el = document.createElement("select");
		this.el.classList.add("textGui", "buttonLike", "resetInput", "textInput");

		this.onValueChangeCbs = new Set();
		this.boundFireOnChangeCbs = this.fireOnChangeCbs.bind(this);
		this.el.addEventListener("change", this.boundFireOnChangeCbs);
		this.setValue(defaultValue);
		this.setDisabled(disabled);

		if (enumObject) this.setEnumObject(enumObject);
		this.updateOptions();
	}

	destructor() {
		this.el.removeEventListener("change", this.boundFireOnChangeCbs);
		this.boundFireOnChangeCbs = null;
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
	}

	setValue(value) {
		if (this.enumObject) {
			if (typeof value != "string") {
				value = this.inverseEnumObject[value];
			}
		}
		const index = this.items.indexOf(value);
		if (index >= 0) {
			this.el.value = String(index);
		} else {
			this.el.value = null;
		}
	}

	get value() {
		return this.getValue();
	}

	/**
	 * @param {Object} opts
	 * @param {boolean} [opts.getAsString]
	 * @param {import("./PropertiesTreeView/PropertiesTreeView.js").SerializableStructureOutputPurpose} [opts.purpose]
	 */
	getValue({
		getAsString = false,
		purpose = "default",
	} = {}) {
		if (purpose == "fileStorage") {
			getAsString = true;
		} else if (purpose == "binaryComposer") {
			getAsString = false;
		}
		let value = this.items[this.el.value];
		if (this.enumObject && !getAsString) {
			value = this.enumObject[value];
		}
		return value;
	}

	onValueChange(cb) {
		this.onValueChangeCbs.add(cb);
	}

	fireOnChangeCbs() {
		for (const cb of this.onValueChangeCbs) {
			cb(this.value);
		}
	}

	setDisabled(disabled) {
		this.disabled = disabled;
		this.el.disabled = disabled;
	}
}
