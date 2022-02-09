import {Vec3} from "../math/Vec3.js";
import {Vec4} from "../math/Vec4.js";

/**
 * Converts world coordinates to screen coordinates using the given camera matrices.
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

/**
 * Generates a ray from a screen position and camera matrices.
 * @param {import("../math/Vec3.js").Vec3ParameterSingle} screenPos The screen position in [-1, 1] range.
 * @param {import("../math/Mat4.js").Mat4} camProjectionMatrix
 * @param {import("../math/Mat4.js").Mat4?} camWorldMatrix
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

import {Vec2} from "../mod.js";
import {mapValue} from "./mod.js";

/**
 * Maps coordinates from element space to the [-1, 1] range.
 * Useful for creating raycast rays.
 * @param {HTMLElement} el
 * @param {import("../math/Vec2.js").Vec2Parameters} elementSpace
 */
export function elementSpaceToScreenSpace(el, ...elementSpace) {
	const {x, y} = new Vec2(...elementSpace);
	const style = globalThis.getComputedStyle(el);
	const paddingLeft = parseFloat(style.paddingLeft);
	const paddingTop = parseFloat(style.paddingTop);

	const xRel = mapValue(paddingLeft, el.clientWidth + paddingLeft, -1, 1, x);
	const yRel = mapValue(paddingTop, el.clientHeight + paddingTop, -1, 1, y);

	return new Vec2(xRel, yRel);
}

/**
 * Maps coordinates from [-1, 1] range to element space.
 *
 * @param {HTMLElement} el
 * @param  {import("../math/Vec2.js").Vec2Parameters} screenSpace
 */
export function screenSpaceToElementSpace(el, ...screenSpace) {
	const {x, y} = new Vec2(...screenSpace);
	const style = globalThis.getComputedStyle(el);
	const paddingLeft = parseFloat(style.paddingLeft);
	const paddingTop = parseFloat(style.paddingTop);

	const xRel = mapValue(-1, 1, paddingLeft, el.clientWidth + paddingLeft, x);
	const yRel = mapValue(-1, 1, paddingTop, el.clientHeight + paddingTop, y);

	return new Vec2(xRel, yRel);
}
