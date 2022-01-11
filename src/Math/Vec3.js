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
 * @typedef {Parameters<vec3SetEmptySignature> | Parameters<vec3SetVec2Signature> | Parameters<vec3SetVec3Signature> | Parameters<vec3SetVec4Signature> | Parameters<vec3SetNumNumSignature> | Parameters<vec3SetArraySignature>} Vec3Parameters
 */

/**
 * @typedef {import("./types.js").GetFirstParam<Vec3Parameters>} Vec3ParameterSingle
 */

export class Vec3 {
	/**
	 * @param {Vec3Parameters} args
	 */
	constructor(...args) {
		this.onChangeCbs = new Set();
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
			if (args.length >= 1) this._x = args[0];
			if (args.length >= 2) this._y = args[1];
			if (args.length >= 3) this._z = args[2];
		}

		this.fireOnChange();
	}

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

	toArray() {
		return [this.x, this.y, this.z];
	}

	onChange(cb) {
		this.onChangeCbs.add(cb);
	}

	removeOnChange(cb) {
		this.onChangeCbs.delete(cb);
	}

	fireOnChange() {
		for (const cb of this.onChangeCbs) {
			cb();
		}
	}
}
