import Mat4 from "../Math/Mat4.js";

export default class EntityMatrixCache {
	constructor() {
		this.localMatrixDirty = true;
		this.worldMatrixDirty = true;
		this.localMatrix = null;
		this.worldMatrix = null;
	}

	/** @typedef {import("../Math/Vec3.js").default} Vec3 */
	/** @typedef {import("../Math/Quaternion.js").default} Quaternion */

	/**
	 * @param {Vec3} globalPos
	 * @param {Quaternion} globalRot
	 * @param {Vec3} globalScale
	 */
	getLocalMatrix(globalPos, globalRot, globalScale) {
		if (this.localMatrixDirty) {
			this.localMatrix = Mat4.createPosRotScale(globalPos, globalRot, globalScale);
			this.localMatrixDirty = false;
		}
		return this.localMatrix;
	}

	getWorldMatrix(traversedPath, globalPos, globalRot, globalScale) {
		if (this.localMatrixDirty || this.worldMatrixDirty) {
			const localMatrix = this.getLocalMatrix(globalPos, globalRot, globalScale);
			if (traversedPath.length > 0) {
				const parent = traversedPath.at(-1).parent;
				const parentMatrix = parent.getWorldMatrix(traversedPath.slice(0, -1));
				this.worldMatrix = Mat4.multiplyMatrices(localMatrix, parentMatrix);
			} else {
				this.worldMatrix = localMatrix.clone();
			}
			this.worldMatrixDirty = false;
		}

		return this.worldMatrix;
	}
}
