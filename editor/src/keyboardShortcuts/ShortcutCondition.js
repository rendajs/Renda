/**
 * @typedef {Object} ShortcutConditionOptionsObject
 * @property {string} name
 * @property {"boolean" | "string"} [type = "boolean"]
 */

import {ShorcutConditionValueSetter} from "./ShorcutConditionValueSetter.js";

/** @typedef {ShortcutConditionOptionsObject | string} ShortcutConditionOptions */

/**
 * A condition that commands check for to see if they should be enabled. Only a
 * single instance exists for each condition.
 * The value of a condition can not be set directly. Use a value setter instead.
 */
export class ShortcutCondition {
	/**
	 * @param {ShortcutConditionOptions} options
	 */
	constructor(options) {
		if (typeof options === "string") {
			options = {name: options};
		}

		this.name = options.name;
		this.type = options.type || "boolean";

		/** @type {Set<ShorcutConditionValueSetter<any>>} */
		this.valueSetters = new Set();

		/** @type {Set<Function>} */
		this.onValueChangeCbs = new Set();

		/** @type {boolean | string[] | null} */
		this.value = null;
		this.updateCurrentValue();
	}

	/**
	 * @param {number} priority
	 */
	requestValueSetter(priority = 0) {
		const valueSetter = new ShorcutConditionValueSetter(this, priority);
		this.valueSetters.add(valueSetter);
		valueSetter.onValueChange(() => {
			this.updateCurrentValue();
		});
		return valueSetter;
	}

	/**
	 * @param {ShorcutConditionValueSetter<any>} valueSetter
	 */
	destroyValueSetter(valueSetter) {
		valueSetter.destructor();
		this.valueSetters.delete(valueSetter);
		this.updateCurrentValue();
	}

	updateCurrentValue() {
		const previousValue = this.value;
		const setters = Array.from(this.valueSetters).filter(setter => setter.value != null).sort((a, b) => b.priority - a.priority);
		if (setters.length == 0) {
			if (this.type == "boolean") {
				this.value = false;
			} else if (this.type == "string") {
				this.value = [""];
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
				this.value = value;
			} else if (this.type == "string") {
				const castSetters = /** @type {ShorcutConditionValueSetter<string>[]} */ (setters);
				const values = castSetters.map(setter => setter.value).filter(value => !!value);
				this.value = /** @type {string[]} */ (values);
			}
		}
		if (this.value != previousValue) {
			this.onValueChangeCbs.forEach(cb => cb(this.value));
		}
	}

	/**
	 * @param {Function} cb
	 */
	onValueChange(cb) {
		this.onValueChangeCbs.add(cb);
	}
}
