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
	#currentNode;
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
		this.#currentNode = this.#rootNode;

		shortcutManager.onCommand("history.undo", this.undo.bind(this));
		shortcutManager.onCommand("history.redo", this.redo.bind(this));
	}

	/**
	 * Pushes a new entry after the active entry.
	 * If the active entry is not the last entry in the stack, a new branch is created.
	 * @param {HistoryEntry} entry
	 */
	pushEntry(entry) {
		const node = this.#createNode(entry, this.#currentNode);
		this.#currentNode.children.push(node);
		this.#currentNode = node;

		// If a new entry is pushed we want to make sure that its branch becomes
		// the main branch. We do this by walking up the tree and moving all nodes
		// along this branch to the beginning of the children array.
		let child = node;
		let parent = node.parent;
		while (parent) {
			const index = parent.children.indexOf(child);
			if (index == -1) break;
			parent.children.splice(index, 1);
			parent.children.unshift(child);
			child = parent;
			parent = child.parent;
		}

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

	/**
	 * Returns true if there is an entry available before the current one.
	 */
	canUndo() {
		return this.#currentNode != this.#rootNode;
	}

	undo() {
		if (!this.canUndo()) return;

		const parent = this.#currentNode.parent;
		if (!parent) {
			throw new Error("Assertion failed, active history node has no parent");
		}
		this.#currentNode.entry.undo();
		this.#currentNode = parent;
		this.#fireOnTreeUpdated();
	}

	/**
	 * Returns true if there is an entry available after the current one.
	 */
	canRedo() {
		return this.#currentNode.children.length > 0;
	}

	redo() {
		if (!this.canRedo()) return;

		const child = this.#currentNode.children[0];
		if (!child) {
			throw new Error("Assertion failed, active history node has no children");
		}
		child.entry.redo();
		this.#currentNode = child;
		this.#fireOnTreeUpdated();
	}

	*getEntries() {
		const activeNode = this.#currentNode;

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
			// We traverse the children array in reverse order, that way entries from the main
			// branch appears at the bottom of the list, and older branches appear higher up.
			for (let i = node.children.length - 1; i >= 0; i--) {
				const child = node.children[i];
				yield* traverseDown(child, indentation + i, active && containsChild(child, activeNode));
			}
		}

		yield* traverseDown(this.#rootNode, 0, true);
	}

	/**
	 * Undoes and redoes entries until the provided entry has been reached.
	 * @param {HistoryEntry} entry
	 */
	travelToEntry(entry) {
		if (entry == this.#currentNode.entry) return;

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
		for (const node of traverseUp(this.#currentNode)) {
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
			this.#currentNode = node.parent;
		}
		for (const node of targetNodeParentChain.slice(targetNodeParentChainIndex + 1)) {
			node.entry.redo();
			this.#currentNode = node;
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
