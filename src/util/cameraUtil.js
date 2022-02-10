import {Vec3} from "../math/Vec3.js";
import {Vec4} from "../math/Vec4.js";

/**
 * Converts world coordinates to screen coordinates using the given camera matrices.
 * Screen coordinates are in the range [0, 1] with y axis down.
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
	pos.x = (pos.x + 1) / 2;
	pos.y = (1 - pos.y) / 2;
	return pos;
}

/**
 * Generates a ray from a screen position and camera matrices.
 * @param {import("../math/Vec3.js").Vec3ParameterSingle} screenPos The screen position in [0, 1] range, y axis down.
 * @param {import("../math/Mat4.js").Mat4} camProjectionMatrix
 * @param {import("../math/Mat4.js").Mat4?} camWorldMatrix
 */
export function getRaycastRayFromScreenPos(screenPos, camProjectionMatrix, camWorldMatrix = null) {
	const viewSpace = new Vec4(screenPos);
	viewSpace.x = (viewSpace.x * 2) - 1;
	viewSpace.y = (viewSpace.y * 2) - 1;
	const start4 = viewSpace.clone();
	const dir4 = viewSpace.clone();
	start4.z = 0;
	dir4.z = 1;
	dir4.y = -dir4.y;
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
 * Maps coordinates from dom space to the [0, 1] range, y axis down, Where the
 * input coordinates are relative to the viewport of the dom.
 * I.e. the `clientX`, `clientY`, `x`, and `y` properties of MouseEvents.
 * Useful for creating raycast rays.
 *
 * @param {HTMLElement} el
 * @param {import("../math/Vec2.js").Vec2Parameters} domPosition
 */
export function domSpaceToScreenSpace(el, ...domPosition) {
	const {x, y} = new Vec2(...domPosition);
	const rect = el.getBoundingClientRect();

	const xRel = mapValue(rect.left, rect.right, 0, 1, x);
	const yRel = mapValue(rect.top, rect.bottom, 0, 1, y);

	return new Vec2(xRel, yRel);
}

/**
 * Maps coordinates from [0, 1] range (y axis down) to the coordinate system
 * used by the viewport of the dom.
 *
 * @param {HTMLElement} el
 * @param  {import("../math/Vec2.js").Vec2Parameters} screenSpace
 */
export function screenSpaceToDomSpace(el, ...screenSpace) {
	const {x, y} = new Vec2(...screenSpace);
	const rect = el.getBoundingClientRect();

	const xRel = mapValue(0, 1, rect.left, rect.right, x);
	const yRel = mapValue(0, 1, rect.top, rect.bottom, y);

	return new Vec2(xRel, yRel);
}
