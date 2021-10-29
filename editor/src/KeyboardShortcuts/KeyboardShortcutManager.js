import ShortcutCommand from "./ShortcutCommand.js";
import AutoRegisterShortcutCommands from "./AutoRegisterShortcutCommands.js";

const modifierKeysOrder = ["cmd", "ctrl", "alt", "shift"];

export default class KeyboardShortcutManager {
	constructor() {
		this.registeredCommands = new Set();
		this.sequenceMap = {
			childNodes: new Map(),
			commands: new Set(),
		};

		this.currentPressedKeys = new Set();
		this.currentPressedSequenceIndex = 0;
		this.currentPressedSequenceHighestLength = 0;
		this.currentPressedSequence = [];

		this.currentActiveHoldStateCommands = new Set();

		this.commandListeners = new Map();

		for (const commandOpts of AutoRegisterShortcutCommands) {
			this.registerCommand(commandOpts, false);
		}
		this.rebuildSequenceMap();

		document.body.addEventListener("keydown", e => {
			this.onKeyEvent(e, true);
		});
		document.body.addEventListener("keyup", e => {
			this.onKeyEvent(e, false);
		});
	}

	registerCommand(opts, rebuildSequenceMap = true) {
		const command = new ShortcutCommand(opts);
		this.registeredCommands.add(command);
		if (rebuildSequenceMap) this.rebuildSequenceMap();
	}

	rebuildSequenceMap() {
		this.sequenceMap.childNodes.clear();
		this.sequenceMap.commands.clear();
		for (const command of this.registeredCommands) {
			const sequence = command.parsedSequence;
			if (!sequence || sequence.length == 0) continue;

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

	onKeyEvent(e, down) {
		const keyName = this.mapKeyCode(e.code);
		if (down) {
			if (this.currentPressedKeys.has(keyName)) return;
			this.currentPressedKeys.add(keyName);
		} else {
			for (const command of this.currentActiveHoldStateCommands) {
				if (command.holdType == "hold" || command.holdType == "smart") {
					if (!command.holdStateActive) continue;

					if (
						command.parsedSequence &&
						command.parsedSequence.length > 0 &&
						command.parsedSequence[command.parsedSequence.length - 1].includes(keyName)
					) {
						if (!command.testAllowSmartHoldDeactivate()) continue;
						command.setHoldStateActive(false);
						this.fireCommand(command);
					}
				}
			}
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
			if (childNode) {
				currentMapNode = childNode;
			} else {
				sequenceHasCommands = false;
				break;
			}
		}
		if (sequenceHasCommands && down) {
			for (const command of currentMapNode.commands) {
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
				this.fireCommand(command);
				this.clearCurrentSequence();
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
		const arr = Array.from(this.currentPressedKeys);
		arr.sort((a, b) => {
			const indexA = modifierKeysOrder.indexOf(a);
			const indexB = modifierKeysOrder.indexOf(b);
			if (indexA == -1 && indexB == -1) {
				return a - b;
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
			case "Enter":
				return "enter";
			default:
				return key;
		}
	}

	onCommand(command, cb) {
		let listeners = this.commandListeners.get(command);
		if (!listeners) {
			listeners = new Set();
			this.commandListeners.set(command, listeners);
		}
		listeners.add(cb);
	}

	removeOnCommand(command, cb) {
		const listeners = this.commandListeners.get(command);
		if (listeners) {
			listeners.delete(cb);
			if (listeners.size <= 0) {
				this.commandListeners.delete(command);
			}
		}
	}

	fireCommand(command) {
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
}
