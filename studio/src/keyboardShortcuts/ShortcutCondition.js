import { ShorcutConditionValueSetter } from "./ShorcutConditionValueSetter.js";

/**
 * @typedef {object} ShortcutConditionOptions
 * @property {"boolean" | "string"} type
 */

/**
 * @template {boolean | string[]} T
 * @typedef {T extends boolean ?
 * ShorcutConditionValueSetter<boolean> :
 * T extends string[] ?
 * ShorcutConditionValueSetter<string> :
 * never} GetShorcutConditionValueSetterType
 */

/**
 * A condition that commands check for to see if they should be enabled. Only a
 * single instance exists for each condition.
 * The value of a condition can not be set directly. Use a value setter instead.
 * @template {boolean | string[]} T
 */
export class ShortcutCondition {
	/** @typedef {(value: T?) => void} OnValueChangeCallback */
	/**
	 * @typedef {GetShorcutConditionValueSetterType<T>} ShorcutConditionValueSetterType
	 */
	/**
	 * @param {string} name
	 * @param {ShortcutConditionOptions} options
	 */
	constructor(name, options) {
		this.name = name;
		this.type = options.type || "boolean";

		/** @type {Set<ShorcutConditionValueSetterType>} */
		this.valueSetters = new Set();

		/** @type {Set<OnValueChangeCallback>} */
		this.onValueChangeCbs = new Set();

		/** @type {T | null} */
		this.value = null;
		this.updateCurrentValue();
	}

	/**
	 * @param {number} priority
	 */
	requestValueSetter(priority = 0) {
		const valueSetter = new ShorcutConditionValueSetter(this, priority);
		const castValueSetter = /** @type {ShorcutConditionValueSetterType} */ (valueSetter);
		this.valueSetters.add(castValueSetter);
		castValueSetter.onValueChange(() => {
			this.updateCurrentValue();
		});
		return castValueSetter;
	}

	/**
	 * @param {ShorcutConditionValueSetterType} valueSetter
	 */
	destroyValueSetter(valueSetter) {
		valueSetter.destructor();
		this.valueSetters.delete(valueSetter);
		this.updateCurrentValue();
	}

	updateCurrentValue() {
		const previousValue = this.value;
		const setters = Array.from(this.valueSetters).filter((setter) => setter.value != null).sort((a, b) => b.priority - a.priority);
		if (setters.length == 0) {
			if (this.type == "boolean") {
				this.value = /** @type {T} */ (false);
			} else if (this.type == "string") {
				this.value = /** @type {T} */ ([""]);
			}
		} else {
			if (this.type == "boolean") {
				const castSetters = /** @type {ShorcutConditionValueSetter<boolean>[]} */ (setters);
				let value = false;
				const highestPriority = castSetters[0].priority;
				// If any of the first priority group is true, the value is set true
				for (const setter of castSetters) {
					if (setter.priority != highestPriority) break;
					if (setter.value) {
						value = true;
						break;
					}
				}
				this.value = /** @type {T} */ (value);
			} else if (this.type == "string") {
				const castSetters = /** @type {ShorcutConditionValueSetter<string>[]} */ (setters);
				const values = castSetters.map((setter) => setter.value).filter((value) => !!value);
				this.value = /** @type {T} */ (values);
			}
		}
		if (this.value != previousValue) {
			this.onValueChangeCbs.forEach((cb) => cb(this.value));
		}
	}

	/**
	 * @param {OnValueChangeCallback} cb
	 */
	onValueChange(cb) {
		this.onValueChangeCbs.add(cb);
	}
}
