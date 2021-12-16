import Mat4 from "../Math/Mat4.js";

export class EntityMatrixCache {
	constructor() {
		this.localMatrixDirty = true;
		this.worldMatrixDirty = true;
		this.localMatrix = null;
		this.worldMatrix = null;
	}

	/**
	 * @param {import("./Entity.js").Entity} entity The entity that the matrix is meant for.
	 * @param {import("./Entity.js").TraversedEntityParentPath} traversedPath The traversed parent path to this entity.
	 */
	getLocalMatrix(entity, traversedPath) {
		if (this.localMatrixDirty) {
			let pos = entity.pos;
			let rot = entity.rot;
			let scale = entity.scale;
			if (traversedPath.length > 0) {
				const parentEntry = traversedPath[traversedPath.length - 1];
				const {pos: instancePos, rot: instanceRot, scale: instanceScale} = entity.getInstancePosRotScale(parentEntry.parent, parentEntry.index);
				if (instancePos) pos = instancePos;
				if (instanceRot) rot = instanceRot;
				if (instanceScale) scale = instanceScale;
			}
			this.localMatrix = Mat4.createPosRotScale(pos, rot, scale);
			this.localMatrixDirty = false;
		}
		return this.localMatrix;
	}

	/**
	 * @param {ConstructorParameters<typeof Mat4>} value
	 */
	setLocalMatrix(...value) {
		this.localMatrix = new Mat4(...value);
		this.localMatrixDirty = false;
	}

	/**
	 * @param {import("./Entity.js").Entity} entity The entity that the matrix is meant for.
	 * @param {import("./Entity.js").TraversedEntityParentPath} traversedPath The traversed parent path to this entity.
	 */
	getWorldMatrix(entity, traversedPath) {
		if (this.localMatrixDirty || this.worldMatrixDirty) {
			const localMatrix = this.getLocalMatrix(entity, traversedPath);
			if (traversedPath.length > 0) {
				const parent = traversedPath[traversedPath.length - 1].parent;
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
