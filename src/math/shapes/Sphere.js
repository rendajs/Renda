import {Vec3} from "../Vec3.js";

/**
 * @typedef {() => Sphere} sphereSetEmptySignature
 * @typedef {(radius: number) => Sphere} sphereSetRadiusSignature
 *
 * // https://github.com/microsoft/TypeScript/issues/47754
 * @typedef {(radius: number, vec: import("../Vec2.js").Vec2) => Sphere} sphereSetRadiusVec2Signature
 * @typedef {(radius: number, vec: Vec3) => Sphere} sphereSetRadiusVec3Signature
 * @typedef {(radius: number, vec: import("../Vec4.js").Vec4) => Sphere} sphereSetRadiusVec4Signature
 * @typedef {(radius: number, x?: number, y?: number, z?: number) => Sphere} sphereSetRadiusNumNumSignature
 * @typedef {(radius: number, xyz: number[]) => Sphere} sphereSetRadiusArraySignature
 *
 * @typedef {(sphere: Sphere) => Sphere} sphereSetSphereSignature
 * @typedef {import("../types.js").MergeParameters<sphereSetEmptySignature | sphereSetRadiusSignature | sphereSetRadiusVec2Signature | sphereSetRadiusVec3Signature | sphereSetRadiusVec4Signature | sphereSetRadiusNumNumSignature | sphereSetRadiusArraySignature | sphereSetSphereSignature>} SphereParameters
 */

/**
 * @typedef {import("../types.js").GetFirstParam<SphereParameters>} SphereParameterSingle
 */

export class Sphere {
	/**
	 * @param {SphereParameters} args
	 */
	constructor(...args) {
		/** @type {Set<() => void>} */
		this.onChangeCbs = new Set();
		this._radius = 1;
		this._pos = new Vec3();
		this._pos.onChange(() => this.fireOnChange());
		this.set(...args);
	}

	get radius() {
		return this._radius;
	}
	set radius(value) {
		this._radius = value;
		this.fireOnChange();
	}

	/**
	 * @returns {Vec3}
	 */
	get pos() {
		return this._pos;
	}
	/**
	 * @param {import("../Vec3.js").Vec3ParameterSingle} pos
	 */
	set pos(pos) {
		this._pos.set(pos);
	}

	/**
	 * @param {SphereParameters} args
	 */
	set(...args) {
		let radius = 1;
		const pos = new Vec3();
		if (args.length == 0) {
			// do nothing
		} else {
			const [arg, ...posArgs] = args;
			if (args.length == 1) {
				if (typeof arg == "number") {
					radius = arg;
				} else if (arg instanceof Sphere) {
					radius = arg.radius;
					pos.set(arg.pos);
				}
			} else {
				radius = /** @type {number} */ (arg);
				pos.set(...posArgs);
			}
		}

		this._radius = radius;
		this._pos.set(pos);
	}

	clone() {
		return new Sphere(this);
	}

	/**
	 * Casts a ray from `start` towards `dir` and returns a raycast result.
	 * Returns null when the ray does not intersect the sphere.
	 * @param {Vec3} start
	 * @param {Vec3} dir
	 * @returns {import("../types.js").RaycastResult?}
	 */
	raycast(start, dir) {
		//   B           C
		//    +---------+
		//     \ -__    |
		//      \   --__|
		//       \      + D
		//        \     |
		//         \    |
		//          \   |
		//           \  |
		//            \ |
		//             \|
		//              + A
		//
		// B is the center of the sphere
		// AC is the ray pointing upwards
		// D is the point where the ray hits the sphere
		// BD is the radius of the sphere
		//
		// Initially only the following lengths are known:
		// - |AB| Distance from sphere center to ray start
		// - |BD| The radius of the sphere

		const ab = this.pos.clone().sub(start);
		const abLength = ab.magnitude;
		// If |AB| < |BD|, the ray starts inside the sphere.
		if (abLength < this.radius) {
			return {
				dist: 0,
				pos: start.clone(),
			};
		}

		// First we project AB onto the ray, this gives us AC.
		const ac = ab.clone().projectOnVector(dir);

		// If the ray is pointing away from the sphere, there is no collision.
		if (ac.dot(dir) < 0) {
			return null;
		}

		const acLength = ac.magnitude;

		// Then using the pytagorean theorem we can calculate |BC| using |AB| and |AC|.
		const bcLength = Math.sqrt(abLength ** 2 - acLength ** 2);

		// If |BC| is bigger than the radius of the sphere, the ray doesn't hit the sphere.
		if (bcLength > this.radius) {
			return null;
		}

		// Using the pytagorean theorem again we can calculate |CD| using |BC| and |BD|.
		const cdLength = Math.sqrt(this.radius ** 2 - bcLength ** 2);

		// Now we calculate |AD| by subtracting |CD| from |AC|. Which gives us the length of the ray.
		const adLength = acLength - cdLength;

		// Finally we can calculate the position of the intersection point.
		const dirWithLength = dir.clone();
		dirWithLength.magnitude = adLength;
		const hit = start.clone().add(dirWithLength);
		return {
			pos: hit,
			dist: adLength,
		};
	}

	/**
	 * @param {() => void} cb
	 */
	onChange(cb) {
		this.onChangeCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	removeOnChange(cb) {
		this.onChangeCbs.delete(cb);
	}

	fireOnChange() {
		for (const cb of this.onChangeCbs) {
			cb();
		}
	}
}
