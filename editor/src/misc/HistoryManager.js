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
	/** @type {WeakMap<HistoryEntry, HistoryNode>} */
	#entryNodesMap = new WeakMap();

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
		this.#entryNodesMap.set(entry, node);
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
		 * @param {HistoryNode} child
		 */
		function containsChild(node, child) {
			if (node == child) return true;
			if (node.children.includes(child)) return true;
			for (const c of node.children) {
				if (containsChild(c, child)) return true;
			}
			return false;
		}

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
				yield* traverseDown(child, indentation + extraIndentation, active && containsChild(child, activeNode));
			}
		}

		yield* traverseDown(this.#rootNode, 0, true);
	}

	/**
	 * Undoes and redoes entries until the provided entry has been reached.
	 * @param {HistoryEntry} entry
	 */
	travelToEntry(entry) {
		if (entry == this.#activeNode.entry) return;

		/**
		 * @param {HistoryNode} node
		 * @returns {Generator<HistoryNode>}
		 */
		function *traverseUp(node) {
			yield node;
			if (node.parent) {
				yield* traverseUp(node.parent);
			}
		}

		const targetNode = this.#entryNodesMap.get(entry);
		if (!targetNode) {
			throw new Error("Failed to travel to history entry, the target entry no longer exists in the history tree.");
		}
		const targetNodeParentChain = Array.from(traverseUp(targetNode)).reverse();
		const targetNodeRoot = targetNodeParentChain[0];
		if (targetNodeRoot != this.#rootNode) {
			throw new Error("Failed to travel to history entry, the target entry wasn't found in the history tree.");
		}

		const activeNodeParentChain = [];
		let targetNodeParentChainIndex = -1;
		for (const node of traverseUp(this.#activeNode)) {
			const index = targetNodeParentChain.indexOf(node);
			if (index >= 0) {
				targetNodeParentChainIndex = index;
				break;
			}
			activeNodeParentChain.push(node);
		}
		if (targetNodeParentChainIndex == -1) {
			throw new Error("Assertion failed, history nodes don't share a parent");
		}
		for (const node of activeNodeParentChain) {
			node.entry.undo();
			if (!node.parent) {
				throw new Error("Assertion failed, history node has no parent");
			}
			this.#activeNode = node.parent;
		}
		for (const node of targetNodeParentChain.slice(targetNodeParentChainIndex + 1)) {
			node.entry.redo();
			this.#activeNode = node;
		}
		this.#fireOnTreeUpdated();
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
