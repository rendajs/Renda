/**
 * @fileoverview The HistoryManager takes care of undo/redo related tasks.
 */

/**
 * @typedef HistoryNode
 * @property {HistoryEntry} entry
 * @property {HistoryNode?} parent
 * @property {HistoryNode[]} children
 */

/**
 * @typedef HistoryEntry
 * @property {string} uiText
 * @property {() => void} undo
 * @property {() => void} redo
 */

export class HistoryManager {
	#rootNode;
	#activeNode;

	/**
	 * @param {import("../keyboardShortcuts/KeyboardShortcutManager.js").KeyboardShortcutManager} shortcutManager
	 */
	constructor(shortcutManager) {
		this.#rootNode = this.#createNode({
			uiText: "Open",
			undo: () => {},
			redo: () => {},
		}, null);
		this.#activeNode = this.#rootNode;

		shortcutManager.onCommand("history.undo", this.undo.bind(this));
		shortcutManager.onCommand("history.redo", this.redo.bind(this));
	}

	/**
	 * Pushes a new entry after the active entry.
	 * If the active entry is not the last entry in the stack, a new branch is created.
	 * @param {HistoryEntry} entry
	 */
	pushEntry(entry) {
		const node = this.#createNode(entry, this.#activeNode);
		this.#activeNode.children.push(node);
		this.#activeNode = node;
	}

	/**
	 * Executes the `redo` function of an entry and pushes it to the stack.
	 * @param {HistoryEntry} entry
	 */
	executeEntry(entry) {
		entry.redo();
		this.pushEntry(entry);
	}

	/**
	 * @param {HistoryEntry} entry
	 * @param {HistoryNode?} parent
	 */
	#createNode(entry, parent) {
		/** @type {HistoryNode} */
		const node = {
			entry,
			parent,
			children: [],
		};
		return node;
	}

	undo() {
		if (this.#activeNode == this.#rootNode) return;

		const parent = this.#activeNode.parent;
		if (!parent) {
			throw new Error("Assertion failed, active history node has no parent");
		}
		this.#activeNode.entry.undo();
		this.#activeNode = parent;
	}

	redo() {
		if (this.#activeNode.children.length == 0) return;

		const child = this.#activeNode.children.at(-1);
		if (!child) {
			throw new Error("Assertion failed, active history node has no children");
		}
		child.entry.redo();
		this.#activeNode = child;
	}
}
