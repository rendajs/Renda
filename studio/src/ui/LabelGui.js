/**
 * @typedef {object} LabelGuiOptionsType
 * @property {boolean} [showLabelBackground = true] Whether to show a background around the label text.
 * @property {string} [tooltip] The text to display when hovering over the label.
 */
/**
 * @typedef {import("./propertiesTreeView/types.ts").GuiOptionsBase & LabelGuiOptionsType} LabelGuiOptions
 */

export class LabelGui {
	/**
	 * @param {LabelGuiOptions} opts
	 */
	constructor({
		showLabelBackground = true,
		tooltip = "",
	} = {}) {
		this._value = "";

		this.el = document.createElement("div");
		this.el.classList.add("label-gui");
		this.el.classList.toggle("label-background", showLabelBackground);
		this.el.textContent = "";
		this.el.title = tooltip;
	}

	get value() {
		return this._value;
	}

	set value(value) {
		this._value = value;
		this.el.textContent = value;
	}

	get tooltip() {
		return this.el.title;
	}

	set tooltip(value) {
		this.el.title = value;
	}
}
