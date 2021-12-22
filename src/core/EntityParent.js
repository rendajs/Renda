export class EntityParent {
	/**
	 * @param {import("./Entity.js").Entity} parent
	 * @param {number} index
	 */
	constructor(parent, index) {
		this.parent = new WeakRef(parent);
		this.index = index;
		/** @type {import("../Math/Vec3.js").Vec3} */
		this.overridePos = null;
		/** @type {import("../Math/Quat.js").Quat} */
		this.overrideRot = null;
		/** @type {import("../Math/Vec3.js").Vec3} */
		this.overrideScale = null;
	}

	getParent() {
		const parent = this.parent.deref();
		return parent || null;
	}
}
