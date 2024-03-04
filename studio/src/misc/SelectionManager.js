import { SelectionGroup } from "./SelectionGroup.js";

/**
 * @typedef {object} SelectionChangeData
 * @property {SelectionGroup<any>} activeSelectionGroup
 * @property {import("./SelectionGroup.js").SelectionGroupChangeData<any>} [changeData]
 */

/** @typedef {(changes: SelectionChangeData) => void} SelectionChangeCallback */

/**
 * Manages SelectionGroups and provides event callbacks that cover all groups.
 */
export class SelectionManager {
	constructor() {
		/** @type {Set<SelectionGroup<any>>} */
		this.selectionGroups = new Set();

		/** @type {SelectionGroup<any>?} */
		this.activeGroup = null;

		/** @type {Set<SelectionChangeCallback>} */
		this.onSelectionChangeCbs = new Set();
	}

	/**
	 * @template T
	 */
	createSelectionGroup() {
		/* eslint-disable jsdoc/no-undefined-types */
		/** @type {SelectionGroup<T>} */
		const group = new SelectionGroup(this);
		/* eslint-enable jsdoc/no-undefined-types */

		this.selectionGroups.add(group);
		group.onSelectionChange((changeData) => {
			this.setActiveSelectionGroup(group, false);
			this.onSelectionChangeCbs.forEach((cb) => cb({
				activeSelectionGroup: group,
				changeData,
			}));
		});
		return group;
	}

	/**
	 * @param {SelectionGroup<any>} group
	 */
	removeSelectionGroup(group) {
		group.destructor();
		this.selectionGroups.delete(group);
	}

	/**
	 * @param {SelectionGroup<any>} group
	 * @param {boolean} fireSelectionChangeCbs
	 */
	setActiveSelectionGroup(group, fireSelectionChangeCbs = true) {
		this.activeGroup = group;
		if (fireSelectionChangeCbs) {
			this.onSelectionChangeCbs.forEach((cb) => cb({ activeSelectionGroup: group }));
		}
	}

	/**
	 * Gets called whenever the active group changes or the selection of a group changes.
	 * @param {SelectionChangeCallback} cb
	 */
	onSelectionChange(cb) {
		this.onSelectionChangeCbs.add(cb);
	}

	/**
	 * @param {SelectionChangeCallback} cb
	 */
	removeOnSelectionChange(cb) {
		this.onSelectionChangeCbs.delete(cb);
	}
}
