/**
 * @param {import("../math/Vec3.js").Vec3} worldPos
 * @param {import("../math/Mat4.js").Mat4} camProjectionMatrix
 * @param {import("../math/Mat4.js").Mat4?} [camWorldMatrix]
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
