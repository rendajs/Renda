import {NumericGui} from "./NumericGui.js";
import {Vec2, Vec3, Vec4} from "../../../src/mod.js";

/**
 * @template {Vec2 | Vec3 | Vec4} T
 * @typedef {Object} VectorGuiOptionsType
 * @property {2 | 3 | 4} [size = 3] The amount of components of the vector.
 * @property {number[] | number | T | null} [min = null] The minimum allowed value for each component.
 * @property {number[] | number | T | null} [max = null] The maximum allowed value for each component.
 * @property {number[] | number | T | null} [step = null] The step value for each component.
 * @property {T} [defaultValue = null] The default value of the gui when it hasn't been modified by the user.
 */
/**
 * @template {Vec2 | Vec3 | Vec4} T
 * @typedef {import("./PropertiesTreeView/PropertiesTreeViewEntry.js").GuiOptions & VectorGuiOptionsType<T>} VectorGuiOptions
 */

/**
 * @typedef {Object} VectorGuiGetValueOptions
 * @property {boolean} [getAsArray]
 * @property {import("./PropertiesTreeView/PropertiesTreeView.js").SerializableStructureOutputPurpose} [purpose]
 */

/**
 * @template {Vec2 | Vec3 | Vec4} T
 */
export class VectorGui {
	/**
	 * @param {VectorGuiOptions<T>} opts
	 */
	constructor({
		defaultValue = null,
		size = 3,
		disabled = false,
		min = null,
		max = null,
		step = null,
	} = {}) {
		if (!defaultValue) {
			if (size == 2) {
				defaultValue = new Vec2();
			} else if (size == 3) {
				defaultValue = new Vec3();
			} else if (size == 4) {
				defaultValue = new Vec4();
			}
		}
		this.defaultValue = defaultValue;
		this.el = document.createElement("div");
		this.el.classList.add("vectorGui", "buttonGroupLike");
		this.numericGuis = [];
		/** @type {((value: T) => any)[]} */
		this.onValueChangeCbs = [];
		this.disabled = false;
		this.size = size;

		const minArr = this.getGuiOptArray(min);
		const maxArr = this.getGuiOptArray(max);
		const stepArr = this.getGuiOptArray(step);

		for (let i = 0; i < size; i++) {
			const numericGui = new NumericGui({
				min: minArr[0],
				max: maxArr[0],
				step: stepArr[0],
			});
			this.numericGuis.push(numericGui);
			this.el.appendChild(numericGui.el);
			numericGui.onValueChange(() => this.fireValueChange());
		}

		this.setValue(defaultValue);
		this.setDisabled(disabled);
	}

	destructor() {
		if (this.el.parentElement) {
			this.el.parentElement.removeChild(this.el);
		}
		for (const gui of this.numericGuis) {
			gui.destructor();
		}
	}

	/**
	 * Utility function for converting a value for the gui options to an array.
	 * @param {number[] | number | T | null} value
	 * @returns {number[]}
	 */
	getGuiOptArray(value) {
		if (Array.isArray(value)) return value;
		if (!value) value = 0;
		if (typeof value == "number") {
			const array = [];
			for (let i = 0; i < this.size; i++) {
				array.push(value);
			}
			return array;
		} else {
			return value.toArray();
		}
	}

	/**
	 * @param {T | number[]} value
	 */
	setValue(value) {
		let arr;
		if (Array.isArray(value)) {
			arr = [...value];
		} else {
			arr = value.toArray();
		}
		for (const [i, gui] of this.numericGuis.entries()) {
			gui.setValue(arr[i]);
		}
	}

	/**
	 * @param {(value: T) => any} cb
	 */
	onValueChange(cb) {
		this.onValueChangeCbs.push(cb);
	}

	/**
	 * @param {VectorGuiGetValueOptions} options
	 */
	getValue({
		getAsArray = false,
		purpose = "default",
	} = {}) {
		if (purpose == "fileStorage") {
			getAsArray = true;
		} else if (purpose == "binaryComposer") {
			getAsArray = true;
		}
		const numbersArr = this.numericGuis.map(g => g.value);
		let val = null;
		if (getAsArray) {
			val = numbersArr;
		} else if (this.numericGuis.length == 2) {
			val = new Vec2(numbersArr);
		} else if (this.numericGuis.length == 3) {
			val = new Vec3(numbersArr);
		} else if (this.numericGuis.length == 4) {
			val = new Vec4(numbersArr);
		}
		return val;
	}

	get value() {
		const castValue = /** @type {T} */ (this.getValue());
		return castValue;
	}

	fireValueChange() {
		for (const cb of this.onValueChangeCbs) {
			const value = /** @type {T} */ (this.value.clone());
			cb(value);
		}
	}

	/**
	 * @param {VectorGuiGetValueOptions} guiOpts
	 */
	isDefaultValue(guiOpts) {
		const val = this.getValue({
			...guiOpts,
			getAsArray: true,
		});
		const defaultVal = this.defaultValue.toArray();
		for (let i = 0; i < this.size; i++) {
			if (val[i] != defaultVal[i]) return false;
		}
		return true;
	}

	/**
	 * @param {boolean} disabled
	 */
	setDisabled(disabled) {
		this.disabled = disabled;
		for (const gui of this.numericGuis) {
			gui.setDisabled(disabled);
		}
	}
}
