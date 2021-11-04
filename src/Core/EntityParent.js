export default class EntityParent {
	/**
	 * @param {import("./Entity.js").default} parent
	 * @param {number} index
	 */
	constructor(parent, index) {
		this.parent = new WeakRef(parent);
		this.index = index;
		/** @type {import("../Math/Vec3.js").default} */
		this.overridePos = null;
		/** @type {import("../Math/Quat.js").default} */
		this.overrideRot = null;
		/** @type {import("../Math/Vec3.js").default} */
		this.overrideScale = null;
	}

	getParent() {
		const parent = this.parent.deref();
		return parent || null;
	}
}
