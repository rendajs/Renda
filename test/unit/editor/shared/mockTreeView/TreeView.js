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

		/** @type {TreeView?} */
		this.parent = null;
		/** @type {TreeView[]} */
		this.children = [];
	}

	clearChildren() {
		this.spy.clearChildrenCallCount++;
	}

	/**
	 * @param {TreeView} child
	 */
	addChild(child) {
		return this.addChildAtIndex(-1, child);
	}

	/**
	 * @param {number} index
	 * @param {TreeView} newChild
	 */
	addChildAtIndex(index, newChild) {
		if (index < 0) {
			index = this.children.length + index + 1;
		}
		if (newChild == null) {
			newChild = new TreeView();
		}
		newChild.setParent(this, false);
		if (index >= this.children.length) {
			this.children.push(newChild);
		} else {
			this.children.splice(index, 0, newChild);
		}
	}

	/**
	 * @param {TreeView} parent
	 */
	setParent(parent, addChild = true) {
		if (parent != this.parent || !addChild) {
			if (this.parent) {
				this.parent.removeChild(this, false);
			}
			this.parent = parent;
			if (parent && addChild) {
				parent.addChild(this);
			}
		}
	}

	/**
	 * @param {TreeView} child
	 */
	removeChild(child, destructChild = true) {
		for (const [i, c] of this.children.entries()) {
			if (child == c) {
				this.removeChildIndex(i, destructChild);
				break;
			}
		}
	}

	/**
	 * @param {number} index
	 */
	removeChildIndex(index, destructChild = true) {
		const child = this.children[index];
		child.parent = null;
		this.children.splice(index, 1);
	}
}
