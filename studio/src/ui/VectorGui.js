import {NumericGui} from "./NumericGui.js";
import {Vec2, Vec3, Vec4} from "../../../src/mod.js";

/**
 * @template {Vec2 | Vec3 | Vec4} T
 * @typedef {object} VectorGuiOptionsType
 * @property {2 | 3 | 4} [size = 3] The amount of components of the vector.
 * @property {number[] | number | T | null} [min = null] The minimum allowed value for each component.
 * @property {number[] | number | T | null} [max = null] The maximum allowed value for each component.
 * @property {number[] | number | T | null} [step = null] The step value for each component.
 * @property {T} [defaultValue = null] The default value of the gui when it hasn't been modified by the user.
 */
/**
 * @template {Vec2 | Vec3 | Vec4} T
 * @typedef {import("./propertiesTreeView/types.ts").GuiOptionsBase & VectorGuiOptionsType<T>} VectorGuiOptions
 */

/**
 * @template {boolean} U
 * @template {import("./propertiesTreeView/types.ts").TreeViewStructureOutputPurpose} V
 * @typedef {object} VectorGuiGetValueOptions
 * @property {U} [getAsArray = false]
 * @property {V} [purpose = "default"]
 */

/**
 * @template U
 * @template V
 * @typedef {object} VectorGuiGetValueOptionsNoConstraints
 * @property {U} [getAsArray]
 * @property {V} [purpose]
 */

/* eslint-disable jsdoc/no-undefined-types */
/**
 * @template {Vec2 | Vec3 | Vec4} T
 * @template {boolean} [U = false]
 * @template {import("./propertiesTreeView/types.ts").TreeViewStructureOutputPurpose} [V = "default"]
 * @typedef {V extends "fileStorage" ? number[] :
 * 		V extends "binarySerialization" ? number[] :
 * 		U extends true ? number[] :
 * T} VectorGuiGetValueReturn
 */

/**
 * @template {Vec2 | Vec3 | Vec4} TVecType
 * @template TOpts
 * @typedef {TOpts extends VectorGuiGetValueOptionsNoConstraints<infer T, infer U> ?
 * 		import("./propertiesTreeView/types.ts").ReplaceUnknown<T, false> extends infer TDefaulted ?
 * 			import("./propertiesTreeView/types.ts").ReplaceUnknown<U, "default"> extends infer UDefaulted ?
 * 				TDefaulted extends boolean ?
 * 					UDefaulted extends import("./propertiesTreeView/types.ts").TreeViewStructureOutputPurpose ?
 * 						VectorGuiGetValueReturn<TVecType, TDefaulted, UDefaulted> :
 * 						never :
 * 					never :
 * 				never :
 * 			never :
 * 		never} GetVectorValueTypeForOptions
 */

/**
 * @template {Vec2 | Vec3 | Vec4} T
 */
export class VectorGui {
	/** @typedef {import("./propertiesTreeView/types.ts").PropertiesTreeViewEntryChangeCallback<T>} OnValueChangeCallback  */

	/** @type {Set<OnValueChangeCallback>} */
	#onValueChangeCbs = new Set();

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
		this.disabled = false;
		this.size = size;

		const minArr = this.getGuiOptArray(min);
		const maxArr = this.getGuiOptArray(max);
		const stepArr = this.getGuiOptArray(step);

		for (let i = 0; i < size; i++) {
			const numericGui = new NumericGui({
				min: minArr[i],
				max: maxArr[i],
				step: stepArr[i] || 0,
			});
			this.numericGuis.push(numericGui);
			this.el.appendChild(numericGui.el);
			numericGui.onValueChange(changeEvent => {
				this.#fireValueChange(changeEvent.trigger);
			});
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
	 */
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
	 * @param {OnValueChangeCallback} cb
	 */
	onValueChange(cb) {
		this.#onValueChangeCbs.add(cb);
	}

	/**
	 * @template {boolean} [U = false]
	 * @template {import("./propertiesTreeView/types.ts").TreeViewStructureOutputPurpose} [V = "default"]
	 * @param {VectorGuiGetValueOptions<U, V>} options
	 */
	getValue({
		getAsArray = /** @type {U} */ (false),
		purpose = /** @type {V} */ ("default"),
	} = {}) {
		let getAsArrayValue = /** @type {boolean} */ (getAsArray);
		if (purpose == "fileStorage") {
			getAsArrayValue = true;
		} else if (purpose == "binarySerialization") {
			getAsArrayValue = true;
		}
		const numbersArr = this.numericGuis.map(g => g.value);
		let val = null;
		if (getAsArrayValue) {
			val = numbersArr;
		} else if (this.numericGuis.length == 2) {
			val = new Vec2(numbersArr);
		} else if (this.numericGuis.length == 3) {
			val = new Vec3(numbersArr);
		} else if (this.numericGuis.length == 4) {
			val = new Vec4(numbersArr);
		}
		return /** @type {VectorGuiGetValueReturn<T, U, V>} */ (val);
	}
	/* eslint-enable jsdoc/no-undefined-types */

	get value() {
		const castValue = /** @type {T} */ (this.getValue());
		return castValue;
	}

	/**
	 * @param {import("./propertiesTreeView/types.ts").ChangeEventTriggerType} trigger
	 */
	#fireValueChange(trigger) {
		for (const cb of this.#onValueChangeCbs) {
			const value = /** @type {T} */ (this.value.clone());
			cb({value, trigger});
		}
	}

	/* eslint-disable jsdoc/no-undefined-types */
	/**
	 * @template {boolean} [U = false]
	 * @template {import("./propertiesTreeView/types.ts").TreeViewStructureOutputPurpose} [V = "default"]
	 * @param {VectorGuiGetValueOptions<U, V>} guiOpts
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
	/* eslint-enable jsdoc/no-undefined-types */

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
