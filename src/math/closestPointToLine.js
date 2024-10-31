import { clamp01 } from "../util/util.js";
import { Vec3 } from "./Vec3.js";

/**
 * Similar to {@linkcode closestPointToLine} except returns a scalar which represents
 *
 * @param {import("./Vec3.js").Vec3} lineStart
 * @param {import("./Vec3.js").Vec3} lineEnd
 * @param {import("./Vec3.js").Vec3} point
 */
export function closestPointToLineParameter(lineStart, lineEnd, point) {
	const deltaLine = lineEnd.clone().sub(lineStart);
	const deltaPoint = point.clone().sub(lineStart);
	return deltaPoint.dot(deltaLine) / deltaLine.dot(deltaLine);
}

/**
 * Takes two lines and returns a point on the first line that is closest to the second line.
 * If the two lines are parellel, or overlapping, the result will be the first position.
 *
 * @param {import("./Vec3.js").Vec3} lineStart
 * @param {import("./Vec3.js").Vec3} lineEnd
 * @param {import("./Vec3.js").Vec3} point
 */
export function closestPointToLine(lineStart, lineEnd, point) {
	const t = closestPointToLineParameter(lineStart, lineEnd, point);
	return Vec3.lerp(lineStart, lineEnd, clamp01(t));
}
