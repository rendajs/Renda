import {ShortcutCondition} from "./ShortcutCondition.js";

/**
 * @template {boolean | string} T
 */
export class ShorcutConditionValueSetter {
	/**
	 * @param {ShortcutCondition} condition
	 * @param {number} priority
	 */
	constructor(condition, priority = 0) {
		this.condition = condition;
		this.priority = priority;
		/** @type {T | null} */
		this.value = null;

		/** @type {Set<Function>} */
		this.onValueChangeCbs = new Set();
		this.destructed = false;
	}

	destructor() {
		if (this.destructed) return;
		this.destructed = true;
		this.condition.destroyValueSetter(this);
	}

	/**
	 * @param {T | null} value
	 */
	setValue(value) {
		this.value = value;
		this.onValueChangeCbs.forEach(cb => cb());
	}

	/**
	 * @param {Function} cb
	 */
	onValueChange(cb) {
		this.onValueChangeCbs.add(cb);
	}
}
