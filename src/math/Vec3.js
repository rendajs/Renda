import { clamp } from "../util/util.js";
import { Mat4 } from "./Mat4.js";
import { Quat } from "./Quat.js";
import { Vec2 } from "./Vec2.js";
import { Vec4 } from "./Vec4.js";

/** @typedef {(changedComponents: number) => void} OnVectorChangeCallback */

/**
 * @typedef {() => Vec3} vec3SetEmptySignature
 * @typedef {(vec: Vec2) => Vec3} vec3SetVec2Signature
 * @typedef {(vec: Vec3) => Vec3} vec3SetVec3Signature
 * @typedef {(vec: Vec4) => Vec3} vec3SetVec4Signature
 * @typedef {(x?: number, y?: number, z?: number) => Vec3} vec3SetNumNumSignature
 * @typedef {(xyz: number[]) => Vec3} vec3SetArraySignature
 * @typedef {import("./MathTypes.js").MergeParameters<vec3SetEmptySignature | vec3SetVec2Signature | vec3SetVec3Signature | vec3SetVec4Signature | vec3SetNumNumSignature | vec3SetArraySignature>} Vec3Parameters
 */

/**
 * @typedef {import("./MathTypes.js").GetFirstParam<Vec3Parameters>} Vec3ParameterSingle
 */

export class Vec3 {
	/**
	 * @param {Vec3Parameters} args
	 */
	constructor(...args) {
		/** @type {Set<OnVectorChangeCallback>} */
		this.onChangeCbs = new Set();
		this._x = 0;
		this._y = 0;
		this._z = 0;
		this.set(...args);
	}

	/** Returns a new vector pointing to the left (-1, 0, 0) */
	static get left() {
		return new Vec3(-1, 0, 0);
	}

	/** Returns a new vector pointing down (0, -1, 0) */
	static get down() {
		return new Vec3(0, -1, 0);
	}

	/** Returns a new vector pointing backwards (0, 0, -1) */
	static get back() {
		return new Vec3(0, 0, -1);
	}

	/** Returns a new vector pointing to the right (1, 0, 0) */
	static get right() {
		return new Vec3(1, 0, 0);
	}

	/** Returns a new vector pointing up (0, 1, 0) */
	static get up() {
		return new Vec3(0, 1, 0);
	}

	/** Returns a new vector pointing forwards (0, 0, 1) */
	static get forward() {
		return new Vec3(0, 0, 1);
	}

	/** Returns a new vector with all components set to one (1, 1, 1) */
	static get one() {
		return new Vec3(1, 1, 1);
	}

	/** Returns a new vector with all components set to zero (0, 0, 0). This is the same as `new Vec3()`. */
	static get zero() {
		return new Vec3();
	}

	get x() {
		return this._x;
	}
	set x(value) {
		this._x = value;
		this.fireOnChange(0x100);
	}

	get y() {
		return this._y;
	}
	set y(value) {
		this._y = value;
		this.fireOnChange(0x010);
	}

	get z() {
		return this._z;
	}
	set z(value) {
		this._z = value;
		this.fireOnChange(0x001);
	}

	/**
	 * @param {Vec3Parameters} args
	 */
	set(...args) {
		const prevX = this._x;
		const prevY = this._y;
		const prevZ = this._z;
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

		let changedComponents = 0x000;
		if (this._x != prevX) changedComponents |= 0x100;
		if (this._y != prevY) changedComponents |= 0x010;
		if (this._z != prevZ) changedComponents |= 0x001;
		if (changedComponents != 0x000) this.fireOnChange(changedComponents);
		return this;
	}

	/**
	 * @returns {Vec3}
	 */
	clone() {
		return new Vec3(this);
	}

	/**
	 * Creates a new Vec2 instance with the same components as this vector.
	 */
	toVec2() {
		return new Vec2(this);
	}

	/**
	 * Creates a new Vec4 instance with the same components as this vector and
	 * the w component set to 1.
	 */
	toVec4() {
		return new Vec4(this);
	}

	toString() {
		return `Vec3<${this._x}, ${this._y}, ${this._z}>`;
	}

	/**
	 * The length of the vector. Can be set to a value to automatically adjust
	 * the components to comply with the new magnitude.
	 */
	get magnitude() {
		return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
	}

	set magnitude(value) {
		const diff = value / this.magnitude;
		if (diff == 1) return;
		let x = this._x * diff;
		let y = this._y * diff;
		let z = this._z * diff;
		if (isNaN(x)) x = 0;
		if (isNaN(y)) y = 0;
		if (isNaN(z)) z = 0;
		this.set(x, y, z);
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
	 * @param {Vec3Parameters} otherVec
	 */
	distanceTo(...otherVec) {
		const other = new Vec3(...otherVec);
		other.sub(this);
		return other.magnitude;
	}

	/**
	 * Multiplies each component of `vecA` by its respective component from `vecB`
	 * without modifying the vectors and returns a new vector with the result.
	 *
	 * @param {Vec3ParameterSingle} vecA
	 * @param {Vec3ParameterSingle} vecB
	 */
	static multiply(vecA, vecB) {
		const vA = new Vec3(vecA);
		return vA.multiply(vecB);
	}

	/**
	 * If a single number is provided, multiplies each component by the number.
	 * Otherwise the arguments are converted to a vector and each component of
	 * this vector are multiplied by the respective component of the other vector.
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
	 * Multiplies each component of this vector by the provided scalar.
	 * @param {number} scalar
	 * @returns {this}
	 */
	multiplyScalar(scalar) {
		const x = this._x * scalar;
		const y = this._y * scalar;
		const z = this._z * scalar;
		return this.set(x, y, z);
	}

	/**
	 * Multiplies each component of this vector by the respective component of
	 * the other vector.
	 * @param {Vec3} vector
	 * @returns {this}
	 */
	multiplyVector(vector) {
		const x = this._x * vector.x;
		const y = this._y * vector.y;
		const z = this._z * vector.z;
		return this.set(x, y, z);
	}

	/**
	 * Divides each component of `vecA` by its respective component from `vecB`
	 * without modifying the vectors and returns a new vector of the result.
	 *
	 * @param {Vec3ParameterSingle} vecA
	 * @param {Vec3ParameterSingle} vecB
	 */
	static divide(vecA, vecB) {
		const vA = new Vec3(vecA);
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
		const newX = x * mat4.values[0][0] + y * mat4.values[1][0] + z * mat4.values[2][0] + mat4.values[3][0];
		const newY = x * mat4.values[0][1] + y * mat4.values[1][1] + z * mat4.values[2][1] + mat4.values[3][1];
		const newZ = x * mat4.values[0][2] + y * mat4.values[1][2] + z * mat4.values[2][2] + mat4.values[3][2];
		return this.set(newX, newY, newZ);
	}

	/**
	 * If a single number is provided, each component of this vector is divided
	 * by the number. Otherwise the arguments are converted to a vector and each
	 * component of this vector is divided by the respective component of the
	 * other vector.
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
	 * Divides each component of this vector by the provided scalar.
	 * @param {number} scalar
	 * @returns {this}
	 */
	divideScalar(scalar) {
		const x = this._x / scalar;
		const y = this._y / scalar;
		const z = this._z / scalar;
		return this.set(x, y, z);
	}

	/**
	 * Divides each component of this vector by the respective component of the
	 * other vector.
	 * @param {Vec3} vector
	 * @returns {this}
	 */
	divideVector(vector) {
		const x = this._x / vector.x;
		const y = this._y / vector.y;
		const z = this._z / vector.z;
		return this.set(x, y, z);
	}

	/**
	 * Adds `vecA` to `vecB` without modifying them and returns a new vector with the result.
	 *
	 * @param {Vec3ParameterSingle} vecA
	 * @param {Vec3ParameterSingle} vecB
	 */
	static add(vecA, vecB) {
		const vA = new Vec3(vecA);
		return vA.add(vecB);
	}

	/**
	 * If a single number is provided, adds the number to each component.
	 * Otherwise the arguments are converted to a vector and each component of
	 * the vector is added to the respective component of this vector.
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
	 * Adds the provided scalar to each component of this vector.
	 * @param {number} scalar
	 * @returns {this}
	 */
	addScalar(scalar) {
		const x = this._x + scalar;
		const y = this._y + scalar;
		const z = this._z + scalar;
		return this.set(x, y, z);
	}

	/**
	 * Adds each component of the provided vector to the respective component of this vector.
	 * @param {Vec3} vector
	 * @returns {this}
	 */
	addVector(vector) {
		const x = this._x + vector.x;
		const y = this._y + vector.y;
		const z = this._z + vector.z;
		return this.set(x, y, z);
	}

	/**
	 * Subtracts `vecA` from `vecB` without modifying them and returns a new vector with the result.
	 *
	 * @param {Vec3ParameterSingle} vecA
	 * @param {Vec3ParameterSingle} vecB
	 */
	static sub(vecA, vecB) {
		const vA = new Vec3(vecA);
		return vA.sub(vecB);
	}

	/**
	 * If a single number is provided, subtracts the number from each component.
	 * Otherwise the arguments are converted to a vector and each component of
	 * the vector is subtracted from the respective component of this vector.
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
	 * Subtracts the provided scalar from each component of this vector.
	 * @param {number} scalar
	 */
	subScalar(scalar) {
		const x = this._x - scalar;
		const y = this._y - scalar;
		const z = this._z - scalar;
		return this.set(x, y, z);
	}

	/**
	 * Subtracts each component of the provided vector from the respective component of this vector.
	 * @param {Vec3} vector
	 */
	subVector(vector) {
		const x = this._x - vector.x;
		const y = this._y - vector.y;
		const z = this._z - vector.z;
		return this.set(x, y, z);
	}

	/**
	 * Sets each component to the minimum of the two vectors.
	 * @param {Vec3Parameters} args
	 */
	min(...args) {
		const vec = new Vec3(...args);
		const x = Math.min(this._x, vec.x);
		const y = Math.min(this._y, vec.y);
		const z = Math.min(this._z, vec.z);
		return this.set(x, y, z);
	}

	/**
	 * Sets each component to the maximum of the two vectors.
	 * @param {Vec3Parameters} args
	 */
	max(...args) {
		const vec = new Vec3(...args);
		const x = Math.max(this._x, vec.x);
		const y = Math.max(this._y, vec.y);
		const z = Math.max(this._z, vec.z);
		return this.set(x, y, z);
	}

	/**
	 * Returns the shortest angle in radians to another vector. This will always
	 * return a value lower than pi, i.e. half a rotation. This essentially
	 * means that if you keep rotating the second angle far enough, eventually
	 * it will start getting closer to this vector again.
	 * This also means the order of the two vectors doesn't matter.
	 *
	 * For example:
	 * ```none
	 *    ^ this
	 *    |
	 *    |
	 *    o 170º = 2.9 pi
	 *     \
	 *      \
	 *       V otherVector
	 * ```
	 *
	 * but...
	 * ```none
	 *                ^ this
	 *                |
	 *                |
	 *  170º = 2.9 pi o
	 *               /
	 *              /
	 *             V otherVector
	 * ```
	 * @param {Vec3} otherVector
	 */
	angleTo(otherVector) {
		const dot = this.dot(otherVector);
		const denominator = this.magnitude * otherVector.magnitude;
		if (denominator == 0) return 0;
		return Math.acos(clamp(dot / denominator, -1, 1));
	}

	/**
	 * Similar to {@linkcode angleTo} but performed on a 2d plane. This returns a negative value
	 * when `this` needs to be rotated counterclockwise in order to reach `otherVector`.
	 * Unlike {@linkcode angleTo}, in this case the order of the two vectors
	 * does matter. If you switch the order of the two vectors, the result will be the
	 * same but multiplied by -1.
	 *
	 * For example:
	 * ```none
	 *    ^ this
	 *    |
	 *    |
	 *    o 170º = 2.9 pi
	 *     \
	 *      \
	 *       V otherVector
	 * ```
	 *
	 * but...
	 * ```none
	 *                  ^ this
	 *                  |
	 *                  |
	 *  -170º = -2.9 pi o
	 *                 /
	 *                /
	 *               V otherVector
	 * ```
	 *
	 * A second `measureAxis` needs to be provided in order for the operation to
	 * know which axis you are trying to measure the angle around.
	 * Note that the measured angle is not the same size as with {@linkcode angleTo}.
	 * Instead, the two vectors are projected on a plane for which your `measureAxis` is the normal.
	 * That is, the two vectors are measured in 2d as seen from the `measureAxis`. So the resulting angle
	 * might actually be shorter compared to {@linkcode angleTo}.
	 *
	 * @param {Vec3} otherVector
	 * @param {Vec3} measureAxis
	 */
	clockwiseAngleTo(otherVector, measureAxis) {
		const projectedThis = new Vec3(this).projectOnPlane(measureAxis);
		const projectedOther = new Vec3(otherVector).projectOnPlane(measureAxis);
		let angle = projectedThis.angleTo(projectedOther);
		const cross = Vec3.cross(this, otherVector);
		const dot = measureAxis.dot(cross);
		if (dot < 0) angle *= -1;
		return angle;
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
	 * @param  {Vec3Parameters} v
	 */
	dot(...v) {
		const other = new Vec3(...v);
		return this._x * other.x + this._y * other.y + this._z * other.z;
	}

	/**
	 * Computes the cross product between this and another vector and changes the value of this vector.
	 *
	 * [Cross product visualisation](https://www.geogebra.org/m/psMTGDgc)
	 *
	 * #### Cross product properties
	 * - The result of the cross product is perpendicular to both input vectors.
	 * - The order of the input vectors is important, when you change the order,
	 * the length is the same, but the direction is reversed.
	 * - When the two vectors point in the same direction, the result is [0, 0, 0].
	 * - When the two vectors point in the exact opposite directions, the result is [0, 0, 0].
	 * - If either one of the input vectors is zero, the result is [0, 0, 0].
	 * - The length of the cross product is the area of a parallelogram with the
	 * two vectors as sides.
	 * - The result is not guaranteed to be normalized, even if the input
	 * vectors are.
	 * @param  {Vec3Parameters} v
	 */
	cross(...v) {
		const other = new Vec3(...v);
		const x = this._y * other.z - this._z * other.y;
		const y = this._z * other.x - this._x * other.z;
		const z = this._x * other.y - this._y * other.x;
		return this.set(x, y, z);
	}

	/**
	 * Performs the cross product between two vectors without modifying them and returns a new vector with the result.
	 * See {@linkcode Vec3.prototype.cross}.
	 *
	 * @param {Vec3ParameterSingle} vecA
	 * @param {Vec3ParameterSingle} vecB
	 */
	static cross(vecA, vecB) {
		const vA = new Vec3(vecA);
		return vA.cross(vecB);
	}

	/**
	 * Projects this vector (a) on another vector (b) and sets the value
	 * of this vector to the result.
	 * ```none
	 *      a ^
	 *       /.
	 *      / .
	 *     /  .
	 *    /   .
	 *   o----+-----> b
	 *   o---->
	 *        c
	 * ```
	 *
	 * In this example `c` is the projection of `a` on `b`:
	 *
	 * ```js
	 * const a = new Vec3();
	 * const b = new Vec3();
	 * const c = a.clone().projectOnVector(b);
	 * ```
	 *
	 * @param {Vec3Parameters} v
	 */
	projectOnVector(...v) {
		const other = new Vec3(...v);
		other.normalize();
		const dot = this.dot(other);
		other.multiplyScalar(dot);
		return this.set(other);
	}

	/**
	 * Projects `vecA` onto `vecB` without modifying and returns a new vector with the result.
	 * See {@linkcode projectOnVector} for more info.
	 *
	 * @param {Vec3ParameterSingle} vecA
	 * @param {Vec3ParameterSingle} vecB
	 */
	static projectVectors(vecA, vecB) {
		return new Vec3(vecA).projectOnVector(vecB);
	}

	/**
	 * Vector rejection is similar to projection, but it returns a vector
	 * perpendicular to the projection.
	 * ```none
	 *      a ^  ^ c
	 *       /.  |
	 *      / .  |
	 *     /  .  |
	 *    /   .  o
	 *   o----+----> b
	 * ```
	 *
	 * In this example `c` is the rejection of `a` from `b`:
	 *
	 * @param  {Vec3Parameters} v
	 */
	rejectFromVector(...v) {
		const projection = this.clone().projectOnVector(...v);
		this.sub(projection);
		return this;
	}

	/**
	 * @param  {Vec3Parameters} planeNormal
	 */
	projectOnPlane(...planeNormal) {
		const normal = new Vec3(...planeNormal);
		const projectedNormal = Vec3.projectVectors(this, normal);
		this.sub(projectedNormal);
		return this;
	}

	/**
	 * Rotates this vector by a quaternion.
	 * @param {import("./Quat.js").QuatParameters} args
	 */
	rotate(...args) {
		// TODO: optimise: gamedev.stackexchange.com/a/50545/87477
		const quat = new Quat(...args);
		const result = new Quat(this.x, this.y, this.z, 1);
		const conjugate = new Quat(quat).invert();
		result.preMultiply(quat);
		result.multiply(conjugate);
		this.set(result.x, result.y, result.z);
		return this;
	}

	/**
	 * @returns {[x: number, y: number, z: number]}
	 */
	toArray() {
		return [this.x, this.y, this.z];
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
	 * @param {OnVectorChangeCallback} cb
	 */
	onChange(cb) {
		this.onChangeCbs.add(cb);
	}

	/**
	 * @param {OnVectorChangeCallback} cb
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
