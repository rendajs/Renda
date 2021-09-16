/**
 * @typedef {Object} LabelGuiOptionsType
 * @property {boolean} [showLabelBackground = true] The text to show when the textfield is empty.
 *
 * @typedef {import("./PropertiesTreeView/PropertiesTreeViewEntry.js").GuiOptions & LabelGuiOptionsType} LabelGuiOptions
 */

export default class LabelGui {
	/**
	 * @param {LabelGuiOptions} opts
	 */
	constructor({
		showLabelBackground = true,
	} = {}) {
		this.showLabelBackground = showLabelBackground;
		this._value = "";

		this.el = document.createElement("div");
		this.el.classList.add("label-gui");
		this.el.textContent = "";
	}

	get value() {
		return this._value;
	}

	set value(value) {
		this._value = value;
		this.el.textContent = value;
	}
}
