import {MalformedSyntaxError, parseExpression, verifyExpression} from "./conditionExpressions.js";

/**
 * - `single` Only fire command once.
 * - `hold` Activate when the key is down, and deactivate when it is up.
 * - `toggle` Activate when the key is down, and deactivate when it is down a second time.
 * - `smart` Same as "hold" but uses "toggle" when the key is pressed only briefly.
 * @typedef {"single" | "hold" | "toggle" | "smart"} ShortcutCommandHoldType
 */

/**
 * @typedef {object} ShortcutCommandOptions
 * @property {string?} [name] User friendly name of the command.
 * @property {string | string[] | null} [defaultKeys] The the keys that trigger the command.
 * @property {string} [conditions] The conditions to check for before triggering the command.
 * @property {ShortcutCommandHoldType} [holdType = "single"] How to deal with keys being held down.
 * See {@linkcode ShortcutCommandHoldType} for a list of possible values.
 * @property {boolean} [captureInsideTextFields] By default, keys are not captured when a text fields has focus in order
 * to allow typing characters in the text field and to navigate using the arrow keys. But if you set this to true
 * keys that are used in the command will be captured and key presses will not go to the text field.
 */

/** @typedef {string[][]} ShortcutCommandSequence */

/**
 * A single command registered in the shortcut manager.
 * This contains the full configuration of a command.
 */
export class ShortcutCommand {
	/**
	 * @param {import("./KeyboardShortcutManager.js").KeyboardShortcutManager<any>} shortcutManager
	 * @param {string} command
	 * @param {ShortcutCommandOptions} opts
	 */
	constructor(shortcutManager, command, {
		name = null,
		defaultKeys = null,
		conditions = "",
		holdType = "single",
		captureInsideTextFields = false,
	}) {
		this.shortcutManager = shortcutManager;
		this.name = name;
		this.command = command;
		this.defaultKeys = defaultKeys;
		this.conditions = conditions;
		this.holdType = holdType;
		this.captureInsideTextFields = captureInsideTextFields;

		this.holdStateActive = false;
		this.holdStateActiveStartTime = -Infinity;
		/** @type {ShortcutCommandSequence[]} */
		this.parsedSequences = [];

		/** @type {import("./conditionExpressions.js").ShortcutCommandAstNode?} */
		this.conditionsAst = null;
		this.conditionAstFailed = false;

		this.parseSequence();
		this.parseConditions();
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

	parseConditions() {
		if (this.conditions) {
			this.conditionAstFailed = false;
			let ast = null;
			try {
				ast = parseExpression(this.conditions);
			} catch (e) {
				this.conditionAstFailed = true;
				if (e instanceof MalformedSyntaxError) {
					// We'll silently ignore this for now, in the future we'll want
					// to visualise shortcuts with malformed syntax in UI.
				} else {
					throw e;
				}
			}
			this.conditionsAst = ast;
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
		if (this.conditionAstFailed) return false;
		if (!this.conditionsAst) return true;
		return verifyExpression(this.conditionsAst, name => {
			const condition = this.shortcutManager.getCondition(name);
			if (!condition) return;
			return condition.value;
		});
	}
}
