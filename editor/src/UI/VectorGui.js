import NumericGui from "./NumericGui.js";
import {Vec2, Vec3, Vec4} from "../../../src/index.js";

/**
 * @typedef {Object} VectorGuiOptionsType
 * @property {2 | 3 | 4} [size = 3] The amount of components of the vector.
 * @property {number} [min = null] The minimum allowed value for each component.
 * @property {number} [max = null] The maximum allowed value for each component.
 * @property {number} [step = null] The step value for each component.
 * @property {Vec2 | Vec3 | Vec4} [defaultValue = null] The default value of the gui when it hasn't been modified by the user.
 *
 * @typedef {import("./PropertiesTreeView/PropertiesTreeViewEntry.js").GuiOptions & VectorGuiOptionsType} VectorGuiOptions
 */

export default class VectorGui {
	/**
	 * @param {VectorGuiOptions} opts
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
		this.onValueChangeCbs = [];
		this.disabled = false;
		this.size = size;

		min = this.getGuiOptArray(min);
		max = this.getGuiOptArray(max);
		step = this.getGuiOptArray(step);

		for (let i = 0; i < size; i++) {
			const numericGui = new NumericGui({
				min: min[0],
				max: max[0],
				step: step[0],
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
		this.el = null;
		for (const gui of this.numericGuis) {
			gui.destructor();
		}
		this.numericGuis = null;
	}

	getGuiOptArray(value) {
		if (Array.isArray(value)) return value;
		if (typeof value == "number" || !value) {
			const array = [];
			for (let i = 0; i < this.size; i++) {
				array.push(value);
			}
			return array;
		} else {
			return value.toArray();
		}
	}

	setValue(vector) {
		let arr;
		if (Array.isArray(vector)) {
			arr = vector;
		} else {
			arr = vector.toArray();
		}
		for (const [i, gui] of this.numericGuis.entries()) {
			gui.setValue(arr[i]);
		}
	}

	onValueChange(cb) {
		this.onValueChangeCbs.push(cb);
	}

	/**
	 * @param {Object} opts
	 * @param {boolean} [opts.getAsArray]
	 * @param {import("./PropertiesTreeView/PropertiesTreeView.js").SerializableStructureOutputPurpose} [opts.purpose]
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
		const castValue = /** @type {Vec3} */ (this.getValue());
		return castValue;
	}

	fireValueChange() {
		for (const cb of this.onValueChangeCbs) {
			cb(this.value.clone());
		}
	}

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

	setDisabled(disabled) {
		this.disabled = disabled;
		for (const gui of this.numericGuis) {
			gui.setDisabled(disabled);
		}
	}
}
