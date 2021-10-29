import editor from "../editorInstance.js";
import ContentWindowProperties from "../WindowManagement/ContentWindows/ContentWindowProperties.js";

/**
 * @template T
 * @typedef {Object} SelectionManagerSelectionChangeData
 * @property {boolean} [reset = false] If true, the selected items array will be cleared.
 * @property {T[]} [added] List of items that were added to the selection.
 * @property {T[]} [removed] List of items that were removed from the selection.
 */

/**
 * Manages selections and notifies listeners when the selection changes.
 * @template T The expected type of selected items.
 */
export default class SelectionManager {
	constructor() {
		/** @type {T[]} */
		this.currentSelectedObjects = [];
	}

	destructor() {
		this.currentSelectedObjects = null;
	}

	/**
	 * @param {SelectionManagerSelectionChangeData<T>} changes
	 */
	changeSelection(changes) {
		if (changes.reset) this.currentSelectedObjects = [];
		this.currentSelectedObjects.push(...changes.added);
		for (const removed of changes.removed) {
			for (let i = this.currentSelectedObjects.length - 1; i >= 0; i--) {
				const obj = this.currentSelectedObjects[i];
				if (obj == removed) this.currentSelectedObjects.splice(i, 1);
			}
		}

		this.updatePropertyWindows();
	}

	updatePropertyWindows() {
		for (const propertyWindow of editor.windowManager.getContentWindowsByConstructor(ContentWindowProperties)) {
			propertyWindow.onSelectionChanged(this);
		}
	}
}
