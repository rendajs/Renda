import {Vec3} from "../math/Vec3.js";
import {Vec4} from "../math/Vec4.js";

/**
 * Converts world coordinates to screen coordinates using the given camera matrices.
 * @param {import("../Math/Vec3.js").Vec3} worldPos
 * @param {import("../Math/Mat4.js").Mat4} camProjectionMatrix
 * @param {import("../Math/Mat4.js").Mat4?} [camWorldMatrix]
 */
export function worldToScreenPos(worldPos, camProjectionMatrix, camWorldMatrix = null) {
	const pos = worldPos.clone();
	if (camWorldMatrix) {
		pos.multiply(camWorldMatrix.inverse());
	}
	pos.multiply(camProjectionMatrix);
	pos.divide(pos.z);
	return pos;
}

/**
 * Generates a ray from a screen position and camera matrices.
 * @param {import("../Math/Vec3.js").Vec3ParameterSingle} screenPos
 * @param {import("../Math/Mat4.js").Mat4} camProjectionMatrix
 * @param {import("../Math/Mat4.js").Mat4?} camWorldMatrix
 */
export function getRaycastRayFromScreenPos(screenPos, camProjectionMatrix, camWorldMatrix = null) {
	const start4 = new Vec4(screenPos);
	const dir4 = new Vec4(screenPos);
	start4.z = 0;
	dir4.z = 1;
	const inverseProjection = camProjectionMatrix.inverse();
	start4.multiply(inverseProjection);
	dir4.multiply(inverseProjection);
	if (camWorldMatrix) {
		start4.multiply(camWorldMatrix);
		dir4.multiply(camWorldMatrix);
	}
	start4.divide(start4.w);
	dir4.divide(dir4.w);
	const start = new Vec3(start4);
	const dir = new Vec3(dir4);
	dir.sub(start);
	dir.normalize();
	return {start, dir};
}
