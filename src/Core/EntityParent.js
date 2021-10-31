// #if !_IS_CLOSURE_BUILD
/**
 * @template {{}} T
 */
// #endif
export default class EntityParent {
	/**
	 * @param {T} parent
	 * @param {number} index
	 */
	constructor(parent, index) {
		this.parent = new WeakRef(parent);
		this.index = index;
		/** @type {import("../Math/Vec3.js").default} */
		this.overridePos = null;
		/** @type {import("../Math/Quaternion.js").default} */
		this.overrideRot = null;
		/** @type {import("../Math/Vec3.js").default} */
		this.overrideScale = null;
	}

	getParent() {
		const parent = this.parent.deref();
		return parent || null;
	}
}
