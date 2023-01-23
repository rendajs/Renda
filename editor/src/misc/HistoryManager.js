/**
 * @fileoverview The HistoryManager takes care of undo/redo related tasks.
 */

/**
 * @typedef HistoryEntry
 * @property {string} uiText
 * @property {() => void} undo
 * @property {() => void} redo
 */

/**
 * @typedef HistoryEntriesResult
 * @property {HistoryEntry} entry
 * @property {number} indentation
 * @property {boolean} active
 * @property {boolean} current
 */

export class HistoryManager {
	#rootNode;
	#activeNode;
	/** @type {Set<() => void>} */
	#onTreeUpdatedCbs = new Set();

	/**
	 * @typedef HistoryNode
	 * @property {HistoryEntry} entry
	 * @property {HistoryNode?} parent
	 * @property {HistoryNode[]} children
	 */

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
		this.#fireOnTreeUpdated();
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
		this.#fireOnTreeUpdated();
	}

	redo() {
		if (this.#activeNode.children.length == 0) return;

		const child = this.#activeNode.children.at(-1);
		if (!child) {
			throw new Error("Assertion failed, active history node has no children");
		}
		child.entry.redo();
		this.#activeNode = child;
		this.#fireOnTreeUpdated();
	}

	*getEntries() {
		const activeNode = this.#activeNode;
		/**
		 * @param {HistoryNode} node
		 * @param {number} indentation
		 * @param {boolean} active
		 * @returns {Generator<HistoryEntriesResult>}
		 */
		function *traverseDown(node, indentation, active) {
			yield {
				entry: node.entry,
				indentation,
				active,
				current: node == activeNode,
			};
			if (node == activeNode) {
				active = false;
			}
			for (const [i, child] of node.children.entries()) {
				const extraIndentation = node.children.length - i - 1;
				yield* traverseDown(child, indentation + extraIndentation, active && extraIndentation == 0);
			}
		}

		yield* traverseDown(this.#rootNode, 0, true);
	}

	/**
	 * @param {() => void} cb
	 */
	onTreeUpdated(cb) {
		this.#onTreeUpdatedCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	removeOnTreeUpdated(cb) {
		this.#onTreeUpdatedCbs.delete(cb);
	}

	#fireOnTreeUpdated() {
		this.#onTreeUpdatedCbs.forEach(cb => cb());
	}
}
