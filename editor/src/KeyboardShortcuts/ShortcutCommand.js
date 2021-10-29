/**
 * - `single` Only fire command once.
 * - `hold` Activate when the key is down, and deactivate when it is up.
 * - `toggle` Activate when the key is down, and deactivate when it is down a second time.
 * - `smart` Same as "hold" but uses "toggle" when the key is pressed only briefly.
 * @typedef {"single" | "hold" | "toggle" | "smart"} ShortcutCommandHoldType
 */

/**
 * @typedef {Object} ShortcutCommandOptions
 * @property {string} [name] User friendly name of the command.
 * @property {string} command The id of the command.
 * @property {string | string[]} [defaultKeys] The the keys that trigger the command.
 * @property {string} [conditions] The conditions to check for before triggering the command.
 * @property {ShortcutCommandHoldType} [holdType = "single"] How to deal with keys being held down.
 */

/** @typedef {string[][]} ShortcutCommandSequence */

export default class ShortcutCommand {
	/**
	 * @param {ShortcutCommandOptions} opts
	 */
	constructor({
		name = null,
		command = null,
		defaultKeys = null,
		conditions = "",
		holdType = "single",
	}) {
		this.name = name;
		this.command = command;
		this.defaultKeys = defaultKeys;
		this.conditions = conditions;
		this.holdType = holdType;

		this.holdStateActive = false;
		this.holdStateActiveStartTime = -Infinity;
		/** @type {ShortcutCommandSequence[]} */
		this.parsedSequences = [];
		this.parseSequence();
	}

	parseSequence() {
		this.parsedSequences = [];
		let keys = this.defaultKeys;
		if (!Array.isArray(keys)) {
			keys = [keys];
		}
		for (const keySequence of keys) {
			const parsedSequence = keySequence.split(" ").map(bit => bit.split("+"));
			this.parsedSequences.push(parsedSequence);
		}
	}

	testAllowSmartHoldDeactivate() {
		if (this.holdType != "smart") return true;

		if (performance.now() - this.holdStateActiveStartTime < 500) return false;

		return true;
	}

	setHoldStateActive(active) {
		if (this.holdType == "single") return false;
		if (this.holdStateActive == active) return false;

		this.holdStateActive = active;
		if (active) {
			this.holdStateActiveStartTime = performance.now();
		}
		return true;
	}
}
