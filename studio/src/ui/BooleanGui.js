/** @typedef {import("./propertiesTreeView/types.ts").GuiOptionsBase} BooleanGuiOptions */

export class BooleanGui {
	/** @typedef {import("./propertiesTreeView/types.ts").PropertiesTreeViewEntryChangeCallback<boolean>} OnValueChangeCallback */
	/** @type {Set<OnValueChangeCallback>} */
	#onValueChangeCbs = new Set();

	constructor({
		defaultValue = false,
		disabled = false,
	} = {}) {
		this.defaultValue = defaultValue;
		this.disabled = disabled;

		this.el = document.createElement("input");
		this.el.type = "checkbox";
		this.el.classList.add("booleanGui", "buttonLike", "resetInput", "textInput");

		this.el.addEventListener("change", this.#fireOnChangeCbs);

		this.setValue(defaultValue);
	}

	destructor() {
		this.el.removeEventListener("change", this.#fireOnChangeCbs);
	}

	/**
	 * @param {boolean} value
	 */
	setValue(value) {
		this.el.checked = value;
	}

	get value() {
		return this.el.checked;
	}

	/**
	 * @param {OnValueChangeCallback} cb
	 */
	onValueChange(cb) {
		this.#onValueChangeCbs.add(cb);
	}

	#fireOnChangeCbs = () => {
		for (const cb of this.#onValueChangeCbs) {
			cb({
				value: this.value,
				trigger: "user",
			});
		}
	};

	/**
	 * @param {boolean} disabled
	 */
	setDisabled(disabled) {
		this.disabled = disabled;
		this.el.disabled = disabled;
	}
}
