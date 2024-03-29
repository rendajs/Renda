/**
 * @typedef {object} TextGuiOptionsType
 * @property {string} [placeholder = ""] The text to show when the textfield is empty.
 */
/**
 * @typedef {import("./propertiesTreeView/types.ts").GuiOptionsBase & TextGuiOptionsType} TextGuiOptions
 */

export class TextGui {
	/** @typedef {import("./propertiesTreeView/types.ts").PropertiesTreeViewEntryChangeCallback<string>} OnChangeCallback */
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
		this.el.classList.add("button-like", "reset-input", "text-input");
		this.el.spellcheck = false;
		this.el.placeholder = placeholder;

		/** @type {Set<OnChangeCallback>} */
		this.onValueChangeCbs = new Set();
		this.el.addEventListener("change", this.#fireOnChangeCbs);

		this.setValue(defaultValue);
		this.setDisabled(disabled);
	}

	destructor() {
		this.el.removeEventListener("change", this.#fireOnChangeCbs);
	}

	/**
	 * @param {string} value
	 */
	setValue(value) {
		this.el.value = value;
		this.#fireOnChangeCbsWithTrigger("application");
	}

	get value() {
		return this.el.value;
	}

	set value(value) {
		this.setValue(value);
	}

	/**
	 * @param {OnChangeCallback} cb
	 */
	onValueChange(cb) {
		this.onValueChangeCbs.add(cb);
	}

	#fireOnChangeCbs = () => {
		this.#fireOnChangeCbsWithTrigger("user");
	};

	/**
	 * @param {import("./propertiesTreeView/types.ts").ChangeEventTriggerType} trigger
	 */
	#fireOnChangeCbsWithTrigger(trigger) {
		for (const cb of this.onValueChangeCbs) {
			cb({
				value: this.value,
				trigger,
			});
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
