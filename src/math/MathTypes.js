import {Mat4} from "./Mat4.js";
import {Quat} from "./Quat.js";
import {Vec2} from "./Vec2.js";
import {Vec3} from "./Vec3.js";
import {Vec4} from "./Vec4.js";

export const mathTypes = [
	Vec2,
	Vec3,
	Vec4,
	Quat,
	Mat4,
];

/**
 * Converts math types into something that can be stored in JSON.stringify.
 * If the value is not a math type, returns null.
 * @param {Vec2 | Vec3 | Vec4 | Quat | Mat4 | any} value
 * @returns {number[] | null}
 */
export function mathTypeToJson(value) {
	if (value instanceof Vec2 || value instanceof Vec3 || value instanceof Vec4 || value instanceof Quat) {
		return value.toArray();
	} else if (value instanceof Mat4) {
		return value.getFlatArray();
	}
	return null;
}

/**
 * @template T
 * @typedef {T extends [infer P] ? P : never} GetFirstParam
 */

/**
 * Mergest multiple signatures into one, so that it can easily be reused between multiple functions.
 * @template {(...args: any) => any} T
 * @typedef {Parameters<T> | [GetFirstParam<Parameters<T>>]} MergeParameters
 */

/**
 * @typedef RaycastResult
 * @property {Vec3} pos
 * @property {number} dist
 */

/**
 * @typedef RaycastShape
 * @property {(start: Vec3, dir: Vec3) => (RaycastResult | null)} raycast
 */
