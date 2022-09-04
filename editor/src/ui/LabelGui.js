/**
 * @typedef {object} LabelGuiOptionsType
 * @property {boolean} [showLabelBackground = true] Whether to show a background around the label text.
 *
 * @typedef {import("./propertiesTreeView/types.js").GuiOptionsBase & LabelGuiOptionsType} LabelGuiOptions
 */

export class LabelGui {
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
