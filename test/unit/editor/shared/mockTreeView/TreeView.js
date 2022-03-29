/**
 * @typedef {Object} TreeViewSpy
 * @property {number} clearChildrenCallCount
 */
/**
 * @typedef {{}} TreeViewMockObject
 */

export class TreeView {
	constructor() {
		/** @type {TreeViewSpy} */
		this.spy = {
			clearChildrenCallCount: 0,
		};

		/** @type {TreeViewMockObject} */
		this.mock = {};
	}
	clearChildren() {
		this.spy.clearChildrenCallCount++;
	}
}
