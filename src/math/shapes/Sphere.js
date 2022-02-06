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
