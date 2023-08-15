import {clamp} from "../util/util.js";
import {Vec3} from "./Vec3.js";
import {Vec4} from "./Vec4.js";

/**
 * @typedef {() => Vec2} vec2SetEmptySignature
 * @typedef {(vec: Vec2) => Vec2} vec2SetVec2Signature
 * @typedef {(vec: Vec3) => Vec2} vec2SetVec3Signature
 * @typedef {(vec: Vec4) => Vec2} vec2SetVec4Signature
 * @typedef {(x: number, y: number) => Vec2} vec2SetNumNumSignature
 * @typedef {(xy: number[]) => Vec2} vec2SetArraySignature
 * @typedef {import("./types.ts").MergeParameters<vec2SetEmptySignature | vec2SetVec2Signature | vec2SetVec3Signature | vec2SetVec4Signature | vec2SetNumNumSignature | vec2SetArraySignature>} Vec2Parameters
 */

/**
 * @typedef {import("./types.ts").GetFirstParam<Vec2Parameters>} Vec2ParameterSingle
 */

export class Vec2 {
	/**
	 * @param {Vec2Parameters} args
	 */
	constructor(...args) {
		/** @type {Set<import("./Vec3.js").OnVectorChangeCallback>} */
		this.onChangeCbs = new Set();
		this._x = 0;
		this._y = 0;
		this.set(...args);
	}

	get x() {
		return this._x;
	}
	set x(value) {
		this._x = value;
		this.fireOnChange(0x10);
	}

	get y() {
		return this._y;
	}
	set y(value) {
		this._y = value;
		this.fireOnChange(0x01);
	}

	/**
	 * @param {Vec2Parameters} args
	 */
	set(...args) {
		const prevX = this._x;
		const prevY = this._y;
		this._x = 0;
		this._y = 0;

		if (args.length == 1) {
			const arg = args[0];
			if (arg instanceof Vec2 || arg instanceof Vec3 || arg instanceof Vec4) {
				this._x = arg.x;
				this._y = arg.y;
			} else if (Array.isArray(arg)) {
				this._x = 0;
				this._y = 0;
				if (arg.length >= 1) this._x = arg[0];
				if (arg.length >= 2) this._y = arg[1];
			}
		} else if (args.length == 2) {
			if (args.length >= 1) this._x = args[0];
			if (args.length >= 2) this._y = args[1];
		}

		let changedComponents = 0x00;
		if (this._x != prevX) changedComponents |= 0x10;
		if (this._y != prevY) changedComponents |= 0x01;
		if (changedComponents != 0x00) this.fireOnChange(changedComponents);
		return this;
	}

	clone() {
		return new Vec2(this);
	}

	/**
	 * Creates a new Vec3 instance with the same components as this vector.
	 */
	toVec3() {
		return new Vec3(this);
	}

	/**
	 * Creates a new Vec4 instance with the same components as this vector and
	 * the w component set to 1.
	 */
	toVec4() {
		return new Vec4(this);
	}

	toString() {
		return `Vec2<${this._x}, ${this._y}>`;
	}

	/**
	 * The length of the vector. Can be set to a value to automatically adjust
	 * the components to comply with the new magnitude.
	 */
	get magnitude() {
		return Math.sqrt(this.x ** 2 + this.y ** 2);
	}

	set magnitude(value) {
		const diff = value / this.magnitude;
		if (diff == 1) return;
		let x = this._x * diff;
		let y = this._y * diff;
		if (isNaN(x)) x = 0;
		if (isNaN(y)) y = 0;
		this.set(x, y);
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
	 * @param {Vec2Parameters} otherVec
	 */
	distanceTo(...otherVec) {
		const other = new Vec2(...otherVec);
		other.sub(this);
		return other.magnitude;
	}

	/**
	 * Multiplies each component of `vecA` by its respective component from `vecB`
	 * without modifying the vectors and returns a new vector with the result.
	 *
	 * @param {Vec2ParameterSingle} vecA
	 * @param {Vec2ParameterSingle} vecB
	 */
	static multiply(vecA, vecB) {
		const vA = new Vec2(vecA);
		return vA.multiply(vecB);
	}

	/**
	 * If a single number is provided, multiplies each component by the number.
	 * Otherwise the arguments are converted to a vector and each component of
	 * this vector are multiplied by the respective component of the other vector.
	 * @param {Parameters<typeof this.multiplyScalar> | Vec2Parameters} args
	 */
	multiply(...args) {
		if (args.length == 1 && typeof args[0] == "number") {
			return this.multiplyScalar(args[0]);
		} else {
			const castArgs = /** @type {Vec2Parameters} */ (args);
			return this.multiplyVector(new Vec2(...castArgs));
		}
	}

	/**
	 * Multiplies each component of this vector by the provided scalar.
	 * @param {number} scalar
	 * @returns {this}
	 */
	multiplyScalar(scalar) {
		const x = this._x * scalar;
		const y = this._y * scalar;
		return this.set(x, y);
	}

	/**
	 * Multiplies each component of this vector by the respective component of
	 * the other vector.
	 * @param {Vec2} vector
	 * @returns {this}
	 */
	multiplyVector(vector) {
		const x = this._x * vector.x;
		const y = this._y * vector.y;
		return this.set(x, y);
	}

	/**
	 * Divides each component of `vecA` by its respective component from `vecB`
	 * without modifying the vectors and returns a new vector of the result.
	 *
	 * @param {Vec2ParameterSingle} vecA
	 * @param {Vec2ParameterSingle} vecB
	 */
	static divide(vecA, vecB) {
		const vA = new Vec2(vecA);
		return vA.divide(vecB);
	}

	/**
	 * If a single number is provided, each component of this vector is divided
	 * by the number. Otherwise the arguments are converted to a vector and each
	 * component of this vector is divided by the respective component of the
	 * other vector.
	 * @param {Parameters<typeof this.multiplyScalar> | Vec2Parameters} args
	 */
	divide(...args) {
		if (args.length == 1 && typeof args[0] == "number") {
			return this.divideScalar(args[0]);
		} else {
			const castArgs = /** @type {Vec2Parameters} */ (args);
			return this.divideVector(new Vec2(...castArgs));
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
		return this.set(x, y);
	}

	/**
	 * Divides each component of this vector by the respective component of the
	 * other vector.
	 * @param {Vec2} vector
	 * @returns {this}
	 */
	divideVector(vector) {
		const x = this._x / vector.x;
		const y = this._y / vector.y;
		return this.set(x, y);
	}

	/**
	 * Adds `vecA` to `vecB` without modifying them and returns a new vector with the result.
	 *
	 * @param {Vec2ParameterSingle} vecA
	 * @param {Vec2ParameterSingle} vecB
	 */
	static add(vecA, vecB) {
		const vA = new Vec2(vecA);
		return vA.add(vecB);
	}

	/**
	 * If a single number is provided, adds the number to each component.
	 * Otherwise the arguments are converted to a vector and each component of
	 * the vector is added to the respective component of this vector.
	 * @param {Parameters<typeof this.addScalar> | Vec2Parameters} args
	 */
	add(...args) {
		if (args.length == 1 && typeof args[0] == "number") {
			return this.addScalar(args[0]);
		} else {
			const castArgs = /** @type {Vec2Parameters} */ (args);
			return this.addVector(new Vec2(...castArgs));
		}
	}

	/**
	 * Adds the provided scalar to each component of this vector.
	 * @param {number} scalar
	 */
	addScalar(scalar) {
		const x = this._x + scalar;
		const y = this._y + scalar;
		return this.set(x, y);
	}

	/**
	 * Adds each component of the provided vector to the respective component of this vector.
	 * @param {Vec2} vector
	 */
	addVector(vector) {
		const x = this._x + vector.x;
		const y = this._y + vector.y;
		return this.set(x, y);
	}

	/**
	 * Subtracts `vecA` from `vecB` without modifying them and returns a new vector with the result.
	 *
	 * @param {Vec2ParameterSingle} vecA
	 * @param {Vec2ParameterSingle} vecB
	 */
	static sub(vecA, vecB) {
		const vA = new Vec2(vecA);
		return vA.sub(vecB);
	}

	/**
	 * If a single number is provided, subtracts the number from each component.
	 * Otherwise the arguments are converted to a vector and each component of
	 * the vector is subtracted from the respective component of this vector.
	 * @param {Parameters<typeof this.subScalar> | Vec2Parameters} args
	 */
	sub(...args) {
		if (args.length == 1 && typeof args[0] == "number") {
			return this.subScalar(args[0]);
		} else {
			const castArgs = /** @type {Vec2Parameters} */ (args);
			return this.subVector(new Vec2(...castArgs));
		}
	}

	/**
	 * Subtracts the provided scalar from each component of this vector.
	 * @param {number} scalar
	 */
	subScalar(scalar) {
		const x = this._x - scalar;
		const y = this._y - scalar;
		return this.set(x, y);
	}

	/**
	 * Subtracts each component of the provided vector from the respective component of this vector.
	 * @param {Vec2} vector
	 */
	subVector(vector) {
		const x = this._x - vector.x;
		const y = this._y - vector.y;
		return this.set(x, y);
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
	 * @param {Vec2} otherVector
	 */
	angleTo(otherVector) {
		const dot = this.dot(otherVector);
		const denominator = this.magnitude * otherVector.magnitude;
		if (denominator == 0) return 0;
		return Math.acos(clamp(dot / denominator, -1, 1));
	}

	/**
	 * Similar to {@linkcode angleTo} except returns a negative value
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
	 * @param {Vec2} otherVector
	 */
	clockwiseAngleTo(otherVector) {
		let angle = this.angleTo(otherVector);
		const cross = this.cross(otherVector);
		if (cross < 0) angle *= -1;
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
	 * @param  {Vec2Parameters} v
	 */
	dot(...v) {
		const other = new Vec2(...v);
		return this._x * other.x + this._y * other.y;
	}

	/**
	 * Computes the cross product between this and another vector and changes the value of this vector.
	 *
	 * [Cross product visualisation](https://www.geogebra.org/m/psMTGDgc) (in 3d)
	 *
	 * #### Cross product properties
	 * - The order of the input vectors is important, when you change the order,
	 * the value is the same, but it is multiplied by -1.
	 * - When the two vectors point in the same direction, the result is 0.
	 * - When the two vectors point in the exact opposite directions, the result is 0.
	 * - If either one of the input vectors is zero, the result is 0.
	 * - The value cross product is the area of a parallelogram with the
	 * two vectors as sides.
	 * @param  {Vec2Parameters} v
	 */
	cross(...v) {
		const other = new Vec2(...v);
		return this.x * other.y - this.y * other.x;
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
	 * const a = new Vec2();
	 * const b = new Vec2();
	 * const c = a.clone().projectOnVector(b);
	 * ```
	 *
	 * @param {Vec2Parameters} v
	 */
	projectOnVector(...v) {
		const other = new Vec2(...v);
		other.normalize();
		const dot = this.dot(other);
		other.multiplyScalar(dot);
		return this.set(other);
	}

	/**
	 * @returns {[x: number, y: number]}
	 */
	toArray() {
		return [this.x, this.y];
	}

	/**
	 * Registers a callback that is called when this vector changes.
	 * The first argument is a bitmask indicating which components of the vector
	 * have changed.
	 * For instance, `0x10` if the first component changed, `0x01` if the
	 * second component changed, and `0x11` if all components changed.
	 *
	 * #### Usage
	 * ```js
	 * const v = new Vec2();
	 * v.onChange(changedComponents => {
	 * 	if (changedComponents & 0x10) {
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
