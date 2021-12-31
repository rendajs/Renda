import {KeyboardShortcutManager} from "./KeyboardShortcutManager.js";

/**
 * - `single` Only fire command once.
 * - `hold` Activate when the key is down, and deactivate when it is up.
 * - `toggle` Activate when the key is down, and deactivate when it is down a second time.
 * - `smart` Same as "hold" but uses "toggle" when the key is pressed only briefly.
 * @typedef {"single" | "hold" | "toggle" | "smart"} ShortcutCommandHoldType
 */

/**
 * @typedef {Object} ShortcutCommandOptions
 * @property {string?} [name] User friendly name of the command.
 * @property {string?} command The id of the command.
 * @property {string | string[] | null} [defaultKeys] The the keys that trigger the command.
 * @property {string} [conditions] The conditions to check for before triggering the command.
 * @property {ShortcutCommandHoldType} [holdType = "single"] How to deal with keys being held down.
 */

/** @typedef {string[][]} ShortcutCommandSequence */

/**
 * A single command registered in the shortcut manager.
 * This contains the full configuration of a command.
 */
export class ShortcutCommand {
	/**
	 * @param {KeyboardShortcutManager} shortcutManager
	 * @param {ShortcutCommandOptions} opts
	 */
	constructor(shortcutManager, {
		name = null,
		command = null,
		defaultKeys = null,
		conditions = "",
		holdType = "single",
	}) {
		this.shortcutManager = shortcutManager;
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
		if (!keys) keys = [];
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

	/**
	 * @param {boolean} active
	 */
	setHoldStateActive(active) {
		if (this.holdType == "single") return false;
		if (this.holdStateActive == active) return false;

		this.holdStateActive = active;
		if (active) {
			this.holdStateActiveStartTime = performance.now();
		}
		return true;
	}

	verifyCondtions() {
		// todo:
		// - support &&
		// - support ||
		// - support !
		// - support ()
		// - support string conditions
		if (!this.conditions) return true;
		const condition = this.shortcutManager.getCondition(this.conditions);
		if (!condition) return false;
		return !!condition.value;
	}
}
