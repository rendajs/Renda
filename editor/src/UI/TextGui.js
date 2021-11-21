/**
 * @typedef {Object} TextGuiOptionsType
 * @property {string} [placeholder = ""] The text to show when the textfield is empty.
 *
 * @typedef {import("./PropertiesTreeView/PropertiesTreeViewEntry.js").GuiOptions & TextGuiOptionsType} TextGuiOptions
 */

export default class TextGui {
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
		this.el.classList.add("textGui", "buttonLike", "resetInput", "textInput");
		this.el.spellcheck = false;
		this.el.placeholder = placeholder;

		this.onValueChangeCbs = new Set();
		this.boundFireOnChangeCbs = this.fireOnChangeCbs.bind(this);
		this.el.addEventListener("change", this.boundFireOnChangeCbs);

		this.setValue(defaultValue);
		this.setDisabled(disabled);
	}

	destructor() {
		this.el.removeEventListener("change", this.boundFireOnChangeCbs);
		this.boundFireOnChangeCbs = null;
	}

	setValue(value) {
		this.el.value = value;
	}

	get value() {
		return this.el.value;
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
