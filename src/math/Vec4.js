import {Vec2} from "./Vec2.js";
import {Vec3} from "./Vec3.js";
import {Mat4} from "./Mat4.js";

/**
 * @typedef {() => Vec4} vec4SetEmptySignature
 * @typedef {(vec: Vec2) => Vec4} vec4SetVec2Signature
 * @typedef {(vec: Vec3) => Vec4} vec4SetVec3Signature
 * @typedef {(vec: Vec4) => Vec4} vec4SetVec4Signature
 * @typedef {(x?: number, y?: number, z?: number, w?: number) => Vec4} vec4SetNumNumSignature
 * @typedef {(xyzw: number[]) => Vec4} vec4SetArraySignature
 * @typedef {import("./types.js").MergeParameters<vec4SetEmptySignature | vec4SetVec2Signature | vec4SetVec3Signature | vec4SetVec4Signature | vec4SetNumNumSignature | vec4SetArraySignature>} Vec4Parameters
 */

export class Vec4 {
	/**
	 * @param {Vec4Parameters} args
	 */
	constructor(...args) {
		/** @type {Set<() => void>} */
		this.onChangeCbs = new Set();
		this._disableOnChange = false;
		this._x = 0;
		this._y = 0;
		this._z = 0;
		this._w = 1;
		this.set(...args);
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

	get w() {
		return this._w;
	}
	set w(value) {
		this._w = value;
		this.fireOnChange();
	}

	/**
	 * @param {Vec4Parameters} args
	 */
	set(...args) {
		if (args.length == 1) {
			const arg = args[0];
			if (arg instanceof Vec4) {
				this._x = arg.x;
				this._y = arg.y;
				this._z = arg.z;
				this._w = arg.w;
			} else if (arg instanceof Vec3) {
				this._x = arg.x;
				this._y = arg.y;
				this._z = arg.z;
			} else if (arg instanceof Vec2) {
				this._x = arg.x;
				this._y = arg.y;
			} else if (Array.isArray(arg)) {
				if (arg.length >= 1) this._x = arg[0];
				if (arg.length >= 2) this._y = arg[1];
				if (arg.length >= 3) this._z = arg[2];
				if (arg.length >= 4) this._w = arg[3];
			} else if (typeof arg == "number") {
				this._x = arg;
			}
		} else {
			const x = args[0];
			const y = args[1];
			const z = args[2];
			const w = args[3];
			if (x != undefined) this._x = x;
			if (y != undefined) this._y = y;
			if (z != undefined) this._z = z;
			if (w != undefined) this._w = w;
		}

		this.fireOnChange();
		return this;
	}

	/**
	 * @returns {Vec4}
	 */
	clone() {
		return new Vec4(this);
	}

	/**
	 * Creates a new Vec2 instance with the same components as this vector.
	 */
	toVec2() {
		return new Vec2(this);
	}

	/**
	 * Creates a new Vec3 instance with the same components as this vector.
	 */
	toVec3() {
		return new Vec3(this);
	}

	get magnitude() {
		return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2 + this.w ** 2);
	}

	set magnitude(value) {
		const diff = value / this.magnitude;
		if (diff == 1) return;
		this._x *= diff;
		this._y *= diff;
		this._z *= diff;
		this._w *= diff;
		if (isNaN(this.x)) this._x = 0;
		if (isNaN(this.y)) this._y = 0;
		if (isNaN(this.z)) this._z = 0;
		if (isNaN(this.w)) this._w = 0;
		this.fireOnChange();
	}

	normalize() {
		this.magnitude = 1;
		return this;
	}

	/**
	 * @param {Vec4Parameters} otherVec
	 */
	distanceTo(...otherVec) {
		const other = new Vec4(...otherVec);
		other.sub(this);
		return other.magnitude;
	}

	/**
	 * @param {Parameters<typeof this.multiplyScalar> | Parameters<typeof this.multiplyMatrix> | Vec4Parameters} args
	 */
	multiply(...args) {
		if (args.length == 1) {
			if (typeof args[0] == "number") {
				return this.multiplyScalar(args[0]);
			} else if (args[0] instanceof Mat4) {
				return this.multiplyMatrix(args[0]);
			}
		}

		const castArgs = /** @type {Vec4Parameters} */ (args);
		return this.multiplyVector(new Vec4(...castArgs));
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
		this._w *= scalar;
		this.fireOnChange();
		return this;
	}

	/**
	 * Multiplies components by the value of their respective components.
	 * @param {Vec4} vector
	 * @returns {this}
	 */
	multiplyVector(vector) {
		this._x *= vector.x;
		this._y *= vector.y;
		this._z *= vector.z;
		this._w *= vector.w;
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
		const w = this._w;
		this._x = x * mat4.values[0][0] + y * mat4.values[1][0] + z * mat4.values[2][0] + w * mat4.values[3][0];
		this._y = x * mat4.values[0][1] + y * mat4.values[1][1] + z * mat4.values[2][1] + w * mat4.values[3][1];
		this._z = x * mat4.values[0][2] + y * mat4.values[1][2] + z * mat4.values[2][2] + w * mat4.values[3][2];
		this._w = x * mat4.values[0][3] + y * mat4.values[1][3] + z * mat4.values[2][3] + w * mat4.values[3][3];
		this.fireOnChange();
		return this;
	}

	/**
	 * @param {Parameters<typeof this.multiplyScalar> | Vec4Parameters} args
	 */
	divide(...args) {
		if (args.length == 1 && typeof args[0] == "number") {
			return this.divideScalar(args[0]);
		} else {
			const castArgs = /** @type {Vec4Parameters} */ (args);
			return this.divideVector(new Vec4(...castArgs));
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
		this._w /= scalar;
		this.fireOnChange();
		return this;
	}

	/**
	 * Divides components by the value of their respective components.
	 * @param {Vec4} vector
	 * @returns {this}
	 */
	divideVector(vector) {
		this._x /= vector.x;
		this._y /= vector.y;
		this._z /= vector.z;
		this._w /= vector.w;
		this.fireOnChange();
		return this;
	}

	/**
	 * If a single number is provided, adds the number to each component.
	 * Otherwise the arguments are converted to a Vector and each of its
	 * components are added to this vector.
	 * @param {Parameters<typeof this.addScalar> | Vec4Parameters} args
	 */
	add(...args) {
		if (args.length == 1 && typeof args[0] == "number") {
			return this.addScalar(args[0]);
		} else {
			const castArgs = /** @type {Vec4Parameters} */ (args);
			return this.addVector(new Vec4(...castArgs));
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
		this._w += scalar;
		this.fireOnChange();
		return this;
	}

	/**
	 * Adds components to their respective components.
	 * @param {Vec4} vector
	 * @returns {this}
	 */
	addVector(vector) {
		this._x += vector.x;
		this._y += vector.y;
		this._z += vector.z;
		this._w += vector.w;
		this.fireOnChange();
		return this;
	}

	/**
	 * If a single number is provided, subtracts the number from each component.
	 * Otherwise the arguments are converted to a Vector and each of its
	 * components are subtracted from this vector.
	 * @param {Parameters<typeof this.subScalar> | Vec4Parameters} args
	 */
	sub(...args) {
		if (args.length == 1 && typeof args[0] == "number") {
			return this.subScalar(args[0]);
		} else {
			const castArgs = /** @type {Vec4Parameters} */ (args);
			return this.subVector(new Vec4(...castArgs));
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
		this._w -= scalar;
		this.fireOnChange();
		return this;
	}

	/**
	 * Subtracts components from their respective components.
	 * @param {Vec4} vector
	 */
	subVector(vector) {
		this._x -= vector.x;
		this._y -= vector.y;
		this._z -= vector.z;
		this._w -= vector.w;
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
	 * In this example `a` is normalised. The dot product of `a` and `b` is the
	 * length of `c`.
	 *
	 * @param  {Vec4Parameters} v
	 */
	dot(...v) {
		const other = new Vec4(...v);
		return this._x * other.x + this._y * other.y + this._z * other.z + this._w * other.w;
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
	 * @param {Vec4Parameters} v
	 */
	projectOnVector(...v) {
		const other = new Vec4(...v);
		const magnitude = other.magnitude;
		const scalar = this.dot(other) / magnitude ** 2;
		this._disableOnChange = true;
		this.set(other).multiplyScalar(scalar);
		this._disableOnChange = false;
		this.fireOnChange();
		return this;
	}

	toArray() {
		return [this.x, this.y, this.z, this.w];
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
