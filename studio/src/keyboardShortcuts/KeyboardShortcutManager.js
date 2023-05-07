import {ShortcutCommand} from "./ShortcutCommand.js";
import {ShortcutCondition} from "./ShortcutCondition.js";

const modifierKeysOrder = ["cmd", "ctrl", "alt", "shift"];

/**
 * @typedef CommandCallbackEvent
 * @property {ShortcutCommand} command
 */
/** @typedef {(event: CommandCallbackEvent) => void} CommandCallback */

/**
 * Responsible for managing keyboard shortcuts and their corresponding commands.
 * This class keeps track of pressed keys and what order they were pressed in.
 * This allows for configuring complex shortcuts that require multiple
 * keystrokes in order to fire.
 * Commands can also be configured to only fire under certain conditions. That
 * way keystrokes don't get consumed when they are not needed, making sure
 * normal browser events still fire.
 * @template {Object<string, import("./ShortcutCommand.js").ShortcutCommandOptions>} TRegisteredShortcuts
 */
export class KeyboardShortcutManager {
	/** @typedef {keyof TRegisteredShortcuts extends string ? keyof TRegisteredShortcuts : string} ShortcutTypes */
	/** @typedef {ShortcutTypes | (string & {})} ShortcutTypesOrString */

	/**
	 * We keep a tree of every shortcut and what keys need to be pressed to trigger
	 * it. That way we can quickly check if no shortcuts are available anymore
	 * without having to iterate over the full list of shortcuts.
	 * We want to know if commands need multiple keystrokes before the full
	 * sequence is performed, because we need to peventDefault() the key events
	 * when a key is part of a valid sequence.
	 * @typedef {object} ShortcutSequenceTreeNode
	 * @property {Map<string, ShortcutSequenceTreeNode>} childNodes
	 * @property {Set<ShortcutCommand>} commands
	 */

	constructor() {
		/** @type {Map<string, ShortcutCondition<any>>} */
		this.registeredConditions = new Map();
		/** @type {Map<string, ShortcutCommand>} */
		this.registeredCommands = new Map();
		/** @type {ShortcutSequenceTreeNode} */
		this.sequenceMap = {
			childNodes: new Map(),
			commands: new Set(),
		};

		/**
		 * @type {Set<string>}
		 */
		this.currentPressedKeys = new Set();
		this.currentPressedSequenceIndex = 0;
		this.currentPressedSequenceHighestLength = 0;
		/** @type {string[]} */
		this.currentPressedSequence = [];
		/**
		 * List of keys that caused a command to fire in the last cycle.
		 * This is to make sure other commands can fire while the previous key
		 * is still held down.
		 * @type {Set<string>}
		 */
		this.currentConsumedKeys = new Set();

		/** @type {Set<ShortcutCommand>} */
		this.currentActiveHoldStateCommands = new Set();

		/** @type {Map<string, Set<CommandCallback>>} */
		this.commandListeners = new Map();

		document.body.addEventListener("keydown", e => {
			this.onKeyEvent(e, true);
		});
		document.body.addEventListener("keyup", e => {
			this.onKeyEvent(e, false);
		});
	}

	/**
	 * @param {string} name
	 * @param {import("./ShortcutCondition.js").ShortcutConditionOptions} opts
	 */
	registerCondition(name, opts) {
		const condition = new ShortcutCondition(name, opts);
		this.registeredConditions.set(condition.name, condition);
		condition.onValueChange(() => {
			// todo: update only the section of the sequence map that is affected
			this.rebuildSequenceMap();
		});
		return condition;
	}

	/**
	 * @template {keyof typeof import("./autoRegisterShortcutConditions.js").autoRegisterShortcutConditions} T
	 * @param {string | T} name
	 */
	getCondition(name) {
		const condition = this.registeredConditions.get(name);
		if (!condition) throw new Error(`Shortcut Condition with name "${name}" not found.`);
		return /** @type {import("./autoRegisterShortcutConditions.js").GetShortcutConditionType<T>} */ (condition);
	}

	/**
	 * @param {ShortcutTypesOrString} command
	 * @param {import("./ShortcutCommand.js").ShortcutCommandOptions} opts
	 * @param {boolean} rebuildSequenceMap
	 */
	registerCommand(command, opts, rebuildSequenceMap = true) {
		const shortcutCommand = new ShortcutCommand(this, command, opts);
		this.registeredCommands.set(command, shortcutCommand);
		if (rebuildSequenceMap) this.rebuildSequenceMap();
	}

	/**
	 * @param {Object<ShortcutTypesOrString, import("./ShortcutCommand.js").ShortcutCommandOptions>} commands
	 */
	registerCommands(commands) {
		const castCommands = /** @type {Object<string, import("./ShortcutCommand.js").ShortcutCommandOptions>} */ (commands);
		for (const [command, commandOpts] of Object.entries(castCommands)) {
			this.registerCommand(command, commandOpts, false);
		}
		this.rebuildSequenceMap();
	}

	rebuildSequenceMap() {
		this.sequenceMap.childNodes.clear();
		this.sequenceMap.commands.clear();
		for (const command of this.registeredCommands.values()) {
			if (!command.verifyCondtions()) continue;
			const sequences = command.parsedSequences;
			if (!sequences || sequences.length == 0) continue;

			for (const sequence of sequences) {
				let currentMapNode = this.sequenceMap;
				for (const bit of sequence) {
					const joinedBit = bit.join("+");
					let childNode = currentMapNode.childNodes.get(joinedBit);
					if (!childNode) {
						childNode = {
							childNodes: new Map(),
							commands: new Set(),
						};
						currentMapNode.childNodes.set(joinedBit, childNode);
					}
					currentMapNode = childNode;
				}
				currentMapNode.commands.add(command);
			}
		}
	}

	/**
	 * @param {KeyboardEvent} e
	 * @param {boolean} down
	 */
	onKeyEvent(e, down) {
		const keyName = this.mapKeyCode(e.code);
		if (down) {
			if (this.currentPressedKeys.has(keyName)) return;
			this.currentPressedKeys.add(keyName);
		} else {
			for (const command of this.currentActiveHoldStateCommands) {
				if (command.holdType == "hold" || command.holdType == "smart") {
					if (!command.holdStateActive) continue;

					if (command.parsedSequences && command.parsedSequences.length > 0) {
						for (const sequence of command.parsedSequences) {
							sequence[command.parsedSequences.length - 1].includes(keyName);
						}
						if (!command.testAllowSmartHoldDeactivate()) continue;
						command.setHoldStateActive(false);
						this.#fireCommand(command);
					}
				}
			}
			this.currentConsumedKeys.delete(keyName);
			const deleted = this.currentPressedKeys.delete(keyName);
			if (!deleted) return;

			// If a modifier key is being released, assume all the keys are released
			// Depending on the OS and browser, some keyup events might not fire if a modifier key is down
			if (modifierKeysOrder.includes(keyName)) {
				this.currentPressedKeys.clear();
			}
		}

		const hasPressedKeys = this.currentPressedKeys.size > 0;
		if (!hasPressedKeys) {
			if (this.currentPressedSequence.length > 0) {
				this.currentPressedSequenceIndex++;
			}
			this.currentPressedSequenceHighestLength = 0;
		} else if (this.currentPressedKeys.size > this.currentPressedSequenceHighestLength) {
			this.currentPressedSequenceHighestLength = this.currentPressedKeys.size;
			this.currentPressedSequence[this.currentPressedSequenceIndex] = this.getCurrentSequenceBit();
		}

		let sequenceHasCommands = true;
		let currentMapNode = this.sequenceMap;
		for (const bit of this.currentPressedSequence) {
			const childNode = currentMapNode.childNodes.get(bit);
			if (childNode && (childNode.commands.size > 0 || childNode.childNodes.size > 0)) {
				currentMapNode = childNode;
			} else {
				sequenceHasCommands = false;
				break;
			}
		}
		const hasTextFieldFocus = document.activeElement?.tagName == "INPUT";
		if (sequenceHasCommands && down) {
			for (const command of currentMapNode.commands) {
				if (hasTextFieldFocus && !command.captureInsideTextFields) continue;
				if (command.holdType != "single") {
					let success = true;
					if (command.holdType == "toggle" || command.holdType == "smart") {
						success = command.setHoldStateActive(!command.holdStateActive);
					} else {
						success = command.setHoldStateActive(true);
					}
					if (!success) break;
					this.currentActiveHoldStateCommands.add(command);
				}
				this.#fireCommand(command);
				this.clearCurrentSequence();
				this.currentConsumedKeys.add(keyName);
				e.preventDefault();
				break;
			}
		} else if (!hasPressedKeys) {
			this.clearCurrentSequence();
		}
	}

	clearCurrentSequence() {
		this.currentPressedSequence = [];
		this.currentPressedSequenceIndex = 0;
	}

	getCurrentSequenceBit() {
		const keys = new Set(this.currentPressedKeys);
		for (const consumedKey of this.currentConsumedKeys) {
			keys.delete(consumedKey);
		}
		const arr = Array.from(keys);
		arr.sort((a, b) => {
			const indexA = modifierKeysOrder.indexOf(a);
			const indexB = modifierKeysOrder.indexOf(b);
			if (indexA == -1 && indexB == -1) {
				return a.localeCompare(b);
			} else if (indexB == -1) {
				return -1;
			} else if (indexA == -1) {
				return 1;
			} else {
				return indexA - indexB;
			}
		});
		return arr.join("+");
	}

	/**
	 * @param {string} key
	 */
	mapKeyCode(key) {
		if (key.startsWith("Arrow")) {
			return key.slice(5).toLowerCase();
		} else if (key.startsWith("Digit")) {
			return key.slice(5).toLowerCase();
		} else if (key.startsWith("Key")) {
			return key.slice(3).toLowerCase();
		}
		switch (key) {
			case "MetaLeft":
			case "MetaRight":
				return "cmd";
			case "AltLeft":
			case "AltRight":
				return "alt";
			case "ShiftLeft":
			case "ShiftRight":
				return "shift";
			case "ControlLeft":
			case "ControlRight":
				return "ctrl";
			default:
				return key.toLowerCase();
		}
	}

	/**
	 * Add an event listener for a specific command.
	 * @param {ShortcutTypesOrString} command The identifier of the command.
	 * @param {CommandCallback} cb The callback to fire when the command is triggered.
	 */
	onCommand(command, cb) {
		let listeners = this.commandListeners.get(command);
		if (!listeners) {
			listeners = new Set();
			this.commandListeners.set(command, listeners);
		}
		listeners.add(cb);
	}

	/**
	 * Remove an event listener for a specific command.
	 * @param {ShortcutTypesOrString} command The identifier of the command.
	 * @param {CommandCallback} cb
	 */
	removeOnCommand(command, cb) {
		const listeners = this.commandListeners.get(command);
		if (listeners) {
			listeners.delete(cb);
			if (listeners.size <= 0) {
				this.commandListeners.delete(command);
			}
		}
	}

	/**
	 * @param {ShortcutCommand} command
	 */
	#fireCommand(command) {
		const listeners = this.commandListeners.get(command.command);
		if (listeners) {
			const eventData = {
				command,
			};
			for (const cb of listeners) {
				cb(eventData);
			}
		}
	}

	/**
	 * @param {string} commandId
	 */
	fireCommand(commandId) {
		const command = this.registeredCommands.get(commandId);
		if (!command) {
			throw new Error(`Shortcut Command "${commandId}" has not been registered.`);
		}
		this.#fireCommand(command);
	}
}
