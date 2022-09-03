/**
 * @typedef {Object} TextGuiOptionsType
 * @property {string} [placeholder = ""] The text to show when the textfield is empty.
 *
 * @typedef {import("./propertiesTreeView/types.js").GuiOptionsBase & TextGuiOptionsType} TextGuiOptions
 */

export class TextGui {
	/**
	 * @param {TextGuiOptions} opts
	 */
	constructor({
		defaultValue = "",
		placeholder = "",
		disabled = false,
	} = {}) {
		this.defaultValue = defaultValue;
		this.disabled = disabled;

		this.el = document.createElement("input");
		this.el.classList.add("buttonLike", "resetInput", "textInput");
		this.el.spellcheck = false;
		this.el.placeholder = placeholder;

		/** @type {Set<(value: string) => any>} */
		this.onValueChangeCbs = new Set();
		this.boundFireOnChangeCbs = this.fireOnChangeCbs.bind(this);
		this.el.addEventListener("change", this.boundFireOnChangeCbs);

		this.setValue(defaultValue);
		this.setDisabled(disabled);
	}

	destructor() {
		this.el.removeEventListener("change", this.boundFireOnChangeCbs);
	}

	/**
	 * @param {string} value
	 */
	setValue(value) {
		this.el.value = value;
	}

	get value() {
		return this.el.value;
	}

	/**
	 * @param {(value: string) => any} cb
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
