/**
 * @typedef {Object} LabelGuiOptionsType
 * @property {boolean} [showLabelBackground = true] Whether to show a background around the label text.
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
		this._value = "";

		this.el = document.createElement("div");
		this.el.classList.add("label-gui");
		this.el.classList.toggle("label-background", showLabelBackground);
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
