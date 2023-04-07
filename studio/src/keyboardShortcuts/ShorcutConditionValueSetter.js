/**
 * A single valueSetter is used to control the value of ShortcutConditions.
 * This is to ensure multiple places in the code can control the value of a
 * condition.
 * @template {boolean | string} T
 */
export class ShorcutConditionValueSetter {
	/**
	 * @param {import("./ShortcutCondition.js").ShortcutCondition<any>} condition
	 * @param {number} priority
	 */
	constructor(condition, priority = 0) {
		this.condition = condition;
		this.priority = priority;
		/** @type {T | null} */
		this.value = null;

		/** @type {Set<Function>} */
		this.onValueChangeCbs = new Set();
		/** @private */
		this.destructed = false;
	}

	destructor() {
		if (this.destructed) return;
		this.destructed = true;
		const castThis = /** @type {ShorcutConditionValueSetter<any>} */ (this);
		this.condition.destroyValueSetter(castThis);
	}

	/**
	 * #### For boolean conditions
	 * If the value of all ValueSetters for a condition are null, the default
	 * value of the condition is used. Otherwise, the value of the ValueSetter
	 * with the highest priority is used.
	 *
	 * #### For string conditions
	 * The value of the condition will be an array of all the values of the
	 * ValueSetters, excluding the ones that are set to null or an empty string.
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
