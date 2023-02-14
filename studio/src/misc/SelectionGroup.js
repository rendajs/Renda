/**
 * @template T
 * @typedef {object} SelectionGroupChangeData
 * @property {boolean} [reset = false] If true, the selected items array will be cleared.
 * @property {T[]} [added] List of items that were added to the selection.
 * @property {T[]} [removed] List of items that were removed from the selection.
 */

/**
 * @template T
 * @typedef {(changes: SelectionGroupChangeData<T>) => void} SelectionChangeCallback
 */

/**
 * Manages selections and notifies listeners when the selection changes.
 * @template T The expected type of selected items.
 */
export class SelectionGroup {
	/**
	 * @param {import("./SelectionManager.js").SelectionManager} selectionManager
	 */
	constructor(selectionManager) {
		this.selectionManager = selectionManager;
		/** @type {T[]} */
		this.currentSelectedObjects = [];

		/** @type {Set<SelectionChangeCallback<T>>} */
		this.onSelectionChangeCbs = new Set();

		this.destructed = false;
	}

	destructor() {
		if (this.destructed) return;
		this.destructed = true;
		this.selectionManager.removeSelectionGroup(this);
		this.currentSelectedObjects = [];
		this.onSelectionChangeCbs.clear();
	}

	/**
	 * @param {SelectionGroupChangeData<T>} changes
	 */
	changeSelection(changes) {
		if (changes.reset) this.currentSelectedObjects = [];
		if (changes.added) {
			this.currentSelectedObjects.push(...changes.added);
		}
		if (changes.removed) {
			for (const removed of changes.removed) {
				for (let i = this.currentSelectedObjects.length - 1; i >= 0; i--) {
					const obj = this.currentSelectedObjects[i];
					if (obj == removed) this.currentSelectedObjects.splice(i, 1);
				}
			}
		}

		this.onSelectionChangeCbs.forEach(cb => cb(changes));
	}

	/**
	 * Sets this group as the currently active group.
	 * This will notify any listeners and update ui according to the current selection.
	 */
	activate() {
		this.selectionManager.setActiveSelectionGroup(this);
	}

	/**
	 * @param {SelectionChangeCallback<T>} cb
	 */
	onSelectionChange(cb) {
		this.onSelectionChangeCbs.add(cb);
	}
}
