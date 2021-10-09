/**
 * @template {{}} T
 */
export default class EntityParent {
	/**
	 * @param {T} parent
	 * @param {number} index
	 */
	constructor(parent, index) {
		this.parent = new WeakRef(parent);
		this.index = index;
	}

	getParent() {
		const parent = this.parent.deref();
		return parent || null;
	}
}
