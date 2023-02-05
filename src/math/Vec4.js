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

/**
 * @typedef {import("./types.js").GetFirstParam<Vec4Parameters>} Vec4ParameterSingle
 */

export class Vec4 {
	/**
	 * @param {Vec4Parameters} args
	 */
	constructor(...args) {
		/** @type {Set<import("./Vec3.js").OnVectorChangeCallback>} */
		this.onChangeCbs = new Set();
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
		this.fireOnChange(0x1000);
	}

	get y() {
		return this._y;
	}
	set y(value) {
		this._y = value;
		this.fireOnChange(0x0100);
	}

	get z() {
		return this._z;
	}
	set z(value) {
		this._z = value;
		this.fireOnChange(0x0010);
	}

	get w() {
		return this._w;
	}
	set w(value) {
		this._w = value;
		this.fireOnChange(0x0001);
	}

	/**
	 * @param {Vec4Parameters} args
	 */
	set(...args) {
		const prevX = this._x;
		const prevY = this._y;
		const prevZ = this._z;
		const prevW = this._w;

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

		let changedComponents = 0x0000;
		if (this._x != prevX) changedComponents |= 0x1000;
		if (this._y != prevY) changedComponents |= 0x0100;
		if (this._z != prevZ) changedComponents |= 0x0010;
		if (this._w != prevW) changedComponents |= 0x0001;
		if (changedComponents != 0x0000) this.fireOnChange(changedComponents);
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

	toString() {
		return `Vec4<${this._x}, ${this._y}, ${this._z}, ${this._w}>`;
	}

	/**
	 * The length of the vector. Can be set to a value to automatically adjust
	 * the components to comply with the new magnitude.
	 */
	get magnitude() {
		return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2 + this.w ** 2);
	}

	set magnitude(value) {
		const diff = value / this.magnitude;
		if (diff == 1) return;
		let x = this._x * diff;
		let y = this._y * diff;
		let z = this._z * diff;
		let w = this._w * diff;
		if (isNaN(x)) x = 0;
		if (isNaN(y)) y = 0;
		if (isNaN(z)) z = 0;
		if (isNaN(w)) w = 0;
		this.set(x, y, z, w);
	}

	/**
	 * Normalizes the vector so that it has a length of 1.
	 * If the length is currently zero, it stays zero.
	 */
	normalize() {
		this.magnitude = 1;
		return this;
	}

	/**
	 * Computes the distance to another vector.
	 * @param {Vec4Parameters} otherVec
	 */
	distanceTo(...otherVec) {
		const other = new Vec4(...otherVec);
		other.sub(this);
		return other.magnitude;
	}

	/**
	 * Multiplies each component of `vecA` by its respective component from `vecB`
	 * without modifying the vectors and returns a new vector with the result.
	 *
	 * @param {Vec4ParameterSingle} vecA
	 * @param {Vec4ParameterSingle} vecB
	 */
	static multiply(vecA, vecB) {
		const vA = new Vec4(vecA);
		return vA.multiply(vecB);
	}

	/**
	 * If a single number is provided, multiplies each component by the number.
	 * Otherwise the arguments are converted to a vector and each component of
	 * this vector are multiplied by the respective component of the other vector.
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
	 * Multiplies each component of this vector by the provided scalar.
	 * @param {number} scalar
	 * @returns {this}
	 */
	multiplyScalar(scalar) {
		const x = this._x * scalar;
		const y = this._y * scalar;
		const z = this._z * scalar;
		const w = this._w * scalar;
		return this.set(x, y, z, w);
	}

	/**
	 * Multiplies each component of this vector by the respective component of
	 * the other vector.
	 * @param {Vec4} vector
	 * @returns {this}
	 */
	multiplyVector(vector) {
		const x = this._x * vector.x;
		const y = this._y * vector.y;
		const z = this._z * vector.z;
		const w = this._w * vector.w;
		return this.set(x, y, z, w);
	}

	/**
	 * Divides each component of `vecA` by its respective component from `vecB`
	 * without modifying the vectors and returns a new vector of the result.
	 *
	 * @param {Vec4ParameterSingle} vecA
	 * @param {Vec4ParameterSingle} vecB
	 */
	static divide(vecA, vecB) {
		const vA = new Vec4(vecA);
		return vA.divide(vecB);
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
		const newX = x * mat4.values[0][0] + y * mat4.values[1][0] + z * mat4.values[2][0] + w * mat4.values[3][0];
		const newY = x * mat4.values[0][1] + y * mat4.values[1][1] + z * mat4.values[2][1] + w * mat4.values[3][1];
		const newZ = x * mat4.values[0][2] + y * mat4.values[1][2] + z * mat4.values[2][2] + w * mat4.values[3][2];
		const newW = x * mat4.values[0][3] + y * mat4.values[1][3] + z * mat4.values[2][3] + w * mat4.values[3][3];
		return this.set(newX, newY, newZ, newW);
	}

	/**
	 * If a single number is provided, each component of this vector is divided
	 * by the number. Otherwise the arguments are converted to a vector and each
	 * component of this vector is divided by the respective component of the
	 * other vector.
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
	 * Divides each component of this vector by the provided scalar.
	 * @param {number} scalar
	 * @returns {this}
	 */
	divideScalar(scalar) {
		const x = this._x / scalar;
		const y = this._y / scalar;
		const z = this._z / scalar;
		const w = this._w / scalar;
		return this.set(x, y, z, w);
	}

	/**
	 * Divides each component of this vector by the respective component of the
	 * other vector.
	 * @param {Vec4} vector
	 * @returns {this}
	 */
	divideVector(vector) {
		const x = this._x / vector.x;
		const y = this._y / vector.y;
		const z = this._z / vector.z;
		const w = this._w / vector.w;
		return this.set(x, y, z, w);
	}

	/**
	 * Adds `vecA` to `vecB` without modifying them and returns a new vector with the result.
	 *
	 * @param {Vec4ParameterSingle} vecA
	 * @param {Vec4ParameterSingle} vecB
	 */
	static add(vecA, vecB) {
		const vA = new Vec4(vecA);
		return vA.add(vecB);
	}

	/**
	 * If a single number is provided, adds the number to each component.
	 * Otherwise the arguments are converted to a vector and each component of
	 * the vector is added to the respective component of this vector.
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
	 * Adds the provided scalar to each component of this vector.
	 * @param {number} scalar
	 * @returns {this}
	 */
	addScalar(scalar) {
		const x = this._x + scalar;
		const y = this._y + scalar;
		const z = this._z + scalar;
		const w = this._w + scalar;
		return this.set(x, y, z, w);
	}

	/**
	 * Adds each component of the provided vector to the respective component of this vector.
	 * @param {Vec4} vector
	 * @returns {this}
	 */
	addVector(vector) {
		const x = this._x + vector.x;
		const y = this._y + vector.y;
		const z = this._z + vector.z;
		const w = this._w + vector.w;
		return this.set(x, y, z, w);
	}

	/**
	 * Subtracts `vecA` from `vecB` without modifying them and returns a new vector with the result.
	 *
	 * @param {Vec4ParameterSingle} vecA
	 * @param {Vec4ParameterSingle} vecB
	 */
	static sub(vecA, vecB) {
		const vA = new Vec4(vecA);
		return vA.sub(vecB);
	}

	/**
	 * If a single number is provided, subtracts the number from each component.
	 * Otherwise the arguments are converted to a vector and each component of
	 * the vector is subtracted from the respective component of this vector.
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
	 * Subtracts the provided scalar from each component of this vector.
	 * @param {number} scalar
	 */
	subScalar(scalar) {
		const x = this._x - scalar;
		const y = this._y - scalar;
		const z = this._z - scalar;
		const w = this._w - scalar;
		return this.set(x, y, z, w);
	}

	/**
	 * Subtracts each component of the provided vector from the respective component of this vector.
	 * @param {Vec4} vector
	 */
	subVector(vector) {
		const x = this._x - vector.x;
		const y = this._y - vector.y;
		const z = this._z - vector.z;
		const w = this._w - vector.w;
		return this.set(x, y, z, w);
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
		other.normalize();
		const dot = this.dot(other);
		other.multiplyScalar(dot);
		return this.set(other);
	}

	toArray() {
		return [this.x, this.y, this.z, this.w];
	}

	/**
	 * Registers a callback that is called when this vector changes.
	 * The first argument is a bitmask indicating which components of the vector
	 * have changed.
	 * For instance, `0x100` if the first component changed, `0x010` if the
	 * second component changed, `0x001` if the third component changed, and
	 * `0x111` if all components changed.
	 *
	 * #### Usage
	 * ```js
	 * const v = new Vec3();
	 * v.onChange(changedComponents => {
	 * 	if (changedComponents & 0x100) {
	 * 		console.log("x changed!");
	 * 	}
	 * });
	 * ```
	 * @param {import("./Vec3.js").OnVectorChangeCallback} cb
	 */
	onChange(cb) {
		this.onChangeCbs.add(cb);
	}

	/**
	 * @param {import("./Vec3.js").OnVectorChangeCallback} cb
	 */
	removeOnChange(cb) {
		this.onChangeCbs.delete(cb);
	}

	/**
	 * @param {number} changedComponents
	 */
	fireOnChange(changedComponents) {
		for (const cb of this.onChangeCbs) {
			cb(changedComponents);
		}
	}
}
