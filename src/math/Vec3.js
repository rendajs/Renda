import {Mat4} from "./Mat4.js";
import {Vec2} from "./Vec2.js";
import {Vec4} from "./Vec4.js";

/**
 * @typedef {() => Vec3} vec3SetEmptySignature
 * @typedef {(vec: Vec2) => Vec3} vec3SetVec2Signature
 * @typedef {(vec: Vec3) => Vec3} vec3SetVec3Signature
 * @typedef {(vec: Vec4) => Vec3} vec3SetVec4Signature
 * @typedef {(x?: number, y?: number, z?: number) => Vec3} vec3SetNumNumSignature
 * @typedef {(xyz: number[]) => Vec3} vec3SetArraySignature
 * @typedef {import("./types.js").MergeParameters<vec3SetEmptySignature | vec3SetVec2Signature | vec3SetVec3Signature | vec3SetVec4Signature | vec3SetNumNumSignature | vec3SetArraySignature>} Vec3Parameters
 */

/**
 * @typedef {import("./types.js").GetFirstParam<Vec3Parameters>} Vec3ParameterSingle
 */

export class Vec3 {
	/**
	 * @param {Vec3Parameters} args
	 */
	constructor(...args) {
		/** @type {Set<() => void>} */
		this.onChangeCbs = new Set();
		this._disableOnChange = false;
		this._x = 0;
		this._y = 0;
		this._z = 0;
		this.set(...args);
	}

	static get left() {
		return new Vec3(-1, 0, 0);
	}

	static get down() {
		return new Vec3(0, -1, 0);
	}

	static get back() {
		return new Vec3(0, 0, -1);
	}

	static get right() {
		return new Vec3(1, 0, 0);
	}

	static get up() {
		return new Vec3(0, 1, 0);
	}

	static get forward() {
		return new Vec3(0, 0, 1);
	}

	static get one() {
		return new Vec3(1, 1, 1);
	}

	static get zero() {
		return new Vec3();
	}

	get x() {
		return this._x;
	}
	set x(value) {
		this._x = value;
		this.fireOnChange();
	}

	get y() {
		return this._y;
	}
	set y(value) {
		this._y = value;
		this.fireOnChange();
	}

	get z() {
		return this._z;
	}
	set z(value) {
		this._z = value;
		this.fireOnChange();
	}

	/**
	 * @param {Vec3Parameters} args
	 */
	set(...args) {
		this._x = 0;
		this._y = 0;
		this._z = 0;

		if (args.length == 1) {
			const arg = args[0];
			if (arg instanceof Vec3 || arg instanceof Vec4) {
				this._x = arg.x;
				this._y = arg.y;
				this._z = arg.z;
			} else if (arg instanceof Vec2) {
				this._x = arg.x;
				this._y = arg.y;
				this._z = 0;
			} else if (Array.isArray(arg)) {
				this._x = 0;
				this._y = 0;
				this._z = 0;
				if (arg.length >= 1) this._x = arg[0];
				if (arg.length >= 2) this._y = arg[1];
				if (arg.length >= 3) this._z = arg[2];
			} else if (typeof arg == "number") {
				this._x = arg;
				this._y = 0;
				this._z = 0;
			}
		} else {
			const x = args[0];
			const y = args[1];
			const z = args[2];
			if (x != undefined) this._x = x;
			if (y != undefined) this._y = y;
			if (z != undefined) this._z = z;
		}

		this.fireOnChange();
		return this;
	}

	/**
	 * @returns {Vec3}
	 */
	clone() {
		return new Vec3(this);
	}

	get magnitude() {
		return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
	}

	set magnitude(value) {
		const diff = value / this.magnitude;
		if (diff == 1) return;
		this._x *= diff;
		this._y *= diff;
		this._z *= diff;
		if (isNaN(this.x)) this._x = 0;
		if (isNaN(this.y)) this._y = 0;
		if (isNaN(this.z)) this._z = 0;
		this.fireOnChange();
	}

	normalize() {
		this.magnitude = 1;
		return this;
	}

	/**
	 * @param {Vec3Parameters} otherVec
	 */
	distanceTo(...otherVec) {
		const other = new Vec3(...otherVec);
		other.sub(this);
		return other.magnitude;
	}

	/**
	 * @param {Parameters<typeof this.multiplyScalar> | Parameters<typeof this.multiplyMatrix> | Vec3Parameters} args
	 */
	multiply(...args) {
		if (args.length == 1) {
			if (typeof args[0] == "number") {
				return this.multiplyScalar(args[0]);
			} else if (args[0] instanceof Mat4) {
				return this.multiplyMatrix(args[0]);
			}
		}

		const castArgs = /** @type {Vec3Parameters} */ (args);
		return this.multiplyVector(new Vec3(...castArgs));
	}

	/**
	 * Multiplies components by a scalar.
	 * @param {number} scalar
	 * @returns {this}
	 */
	multiplyScalar(scalar) {
		this._x *= scalar;
		this._y *= scalar;
		this._z *= scalar;
		this.fireOnChange();
		return this;
	}

	/**
	 * Multiplies components by the value of their respective components.
	 * @param {Vec3} vector
	 * @returns {this}
	 */
	multiplyVector(vector) {
		this._x *= vector.x;
		this._y *= vector.y;
		this._z *= vector.z;
		this.fireOnChange();
		return this;
	}

	/**
	 * Multiplies the vector by a matrix.
	 * @param {Mat4} mat4
	 * @returns {this}
	 */
	multiplyMatrix(mat4) {
		const x = this._x;
		const y = this._y;
		const z = this._z;
		this._x = x * mat4.values[0][0] + y * mat4.values[1][0] + z * mat4.values[2][0] + mat4.values[3][0];
		this._y = x * mat4.values[0][1] + y * mat4.values[1][1] + z * mat4.values[2][1] + mat4.values[3][1];
		this._z = x * mat4.values[0][2] + y * mat4.values[1][2] + z * mat4.values[2][2] + mat4.values[3][2];
		this.fireOnChange();
		return this;
	}

	/**
	 * @param {Parameters<typeof this.multiplyScalar> | Vec3Parameters} args
	 */
	divide(...args) {
		if (args.length == 1 && typeof args[0] == "number") {
			return this.divideScalar(args[0]);
		} else {
			const castArgs = /** @type {Vec3Parameters} */ (args);
			return this.divideVector(new Vec3(...castArgs));
		}
	}

	/**
	 * Divides components by a scalar.
	 * @param {number} scalar
	 * @returns {this}
	 */
	divideScalar(scalar) {
		this._x /= scalar;
		this._y /= scalar;
		this._z /= scalar;
		this.fireOnChange();
		return this;
	}

	/**
	 * Divides components by the value of their respective components.
	 * @param {Vec3} vector
	 * @returns {this}
	 */
	divideVector(vector) {
		this._x /= vector.x;
		this._y /= vector.y;
		this._z /= vector.z;
		this.fireOnChange();
		return this;
	}

	/**
	 * If a single number is provided, adds the number to each component.
	 * Otherwise the arguments are converted to a Vector and each of its
	 * components are added to this vector.
	 * @param {Parameters<typeof this.addScalar> | Vec3Parameters} args
	 */
	add(...args) {
		if (args.length == 1 && typeof args[0] == "number") {
			return this.addScalar(args[0]);
		} else {
			const castArgs = /** @type {Vec3Parameters} */ (args);
			return this.addVector(new Vec3(...castArgs));
		}
	}

	/**
	 * Adds a scalar to each component.
	 * @param {number} scalar
	 * @returns {this}
	 */
	addScalar(scalar) {
		this._x += scalar;
		this._y += scalar;
		this._z += scalar;
		this.fireOnChange();
		return this;
	}

	/**
	 * Adds components to their respective components.
	 * @param {Vec3} vector
	 * @returns {this}
	 */
	addVector(vector) {
		this._x += vector.x;
		this._y += vector.y;
		this._z += vector.z;
		this.fireOnChange();
		return this;
	}

	/**
	 * If a single number is provided, subtracts the number from each component.
	 * Otherwise the arguments are converted to a Vector and each of its
	 * components are subtracted from this vector.
	 * @param {Parameters<typeof this.subScalar> | Vec3Parameters} args
	 */
	sub(...args) {
		if (args.length == 1 && typeof args[0] == "number") {
			return this.subScalar(args[0]);
		} else {
			const castArgs = /** @type {Vec3Parameters} */ (args);
			return this.subVector(new Vec3(...castArgs));
		}
	}

	/**
	 * Subtracts a scalar from each component.
	 * @param {number} scalar
	 */
	subScalar(scalar) {
		this._x -= scalar;
		this._y -= scalar;
		this._z -= scalar;
		this.fireOnChange();
		return this;
	}

	/**
	 * Subtracts components from their respective components.
	 * @param {Vec3} vector
	 */
	subVector(vector) {
		this._x -= vector.x;
		this._y -= vector.y;
		this._z -= vector.z;
		this.fireOnChange();
		return this;
	}

	/**
	 * Computes the dot product between this vector and another vector.
	 *
	 * [Dot product visualisation](https://falstad.com/dotproduct/)
	 *
	 * - When the two vectors point in opposite directions (i.e. the angle is greater than 90º), the dot product is negative.
	 * ```none
	 *    ^
	 *     \
	 *      \ 110º
	 *       o---->
	 * ```
	 * - When the two vectors point in the same direction (i.e. the angle is less than 90º), the dot product is positive.
	 * ```none
	 *      ^
	 *     /
	 *    / 70º
	 *   o---->
	 * ```
	 * - When the two vectors are perpendicular, the dot product is zero.
	 * ```none
	 *   ^
	 *   |
	 *   | 90º
	 *   o---->
	 * ```
	 * - The dot product returns the same value regardless of the order of the vectors.
	 * - If one vector is normalized, the dot product is essentially the length
	 * of the other vector, projected on the normalized one.
	 * ```none
	 *    b ^
	 *     /.
	 *    / .
	 *   o--+---> a
	 *   o-->
	 *      c
	 * ```
	 * In this example the dot product of `a` and `b` is the length of `c`.
	 *
	 * @param  {Vec3Parameters} v
	 */
	dot(...v) {
		const other = new Vec3(...v);
		return this._x * other.x + this._y * other.y + this._z * other.z;
	}

	/**
	 * Projects this vector (a) on another vector (b) and sets the value
	 * of this vector to the result.
	 * ```js
	 *     a ^
	 *      /.
	 *     / .
	 *    /  .
	 *   o---+---> b
	 *   o--->
	 *       c
	 * ```
	 * In this example `c` is the projection of `a` on `b`.
	 *
	 * @param {Vec3Parameters} v
	 */
	projectOnVector(...v) {
		const other = new Vec3(...v);
		const magnitude = other.magnitude;
		const scalar = this.dot(other) / magnitude ** 2;
		this._disableOnChange = true;
		this.set(other).multiplyScalar(scalar);
		this._disableOnChange = false;
		this.fireOnChange();
		return this;
	}

	toArray() {
		return [this.x, this.y, this.z];
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
		if (this._disableOnChange) return;
		for (const cb of this.onChangeCbs) {
			cb();
		}
	}
}
