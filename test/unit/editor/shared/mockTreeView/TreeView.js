/**
 * @typedef {Object} TreeViewSpy
 * @property {number} clearChildrenCallCount
 */

export class TreeView {
	constructor() {
		/** @type {TreeViewSpy} */
		this.spy = {
			clearChildrenCallCount: 0,
		};
	}
	clearChildren() {
		this.spy.clearChildrenCallCount++;
	}
}
