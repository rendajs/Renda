import Vec2 from "./Vec2.js";
import Vec3 from "./Vec3.js";
import Mat4 from "./Mat4.js";

/**
 * @typedef {() => Vec4} vec4SetEmptySignature
 * @typedef {(vec: Vec2) => Vec4} vec4SetVec2Signature
 * @typedef {(vec: Vec3) => Vec4} vec4SetVec3Signature
 * @typedef {(vec: Vec4) => Vec4} vec4SetVec4Signature
 * @typedef {(x?: number, y?: number, z?: number, w?: number) => Vec4} vec4SetNumNumSignature
 * @typedef {(xyzw: number[]) => Vec4} vec4SetArraySignature
 * @typedef {Parameters<vec4SetEmptySignature> | Parameters<vec4SetVec2Signature> | Parameters<vec4SetVec3Signature> | Parameters<vec4SetVec4Signature> | Parameters<vec4SetNumNumSignature> | Parameters<vec4SetArraySignature>} Vec4Parameters
 */

export default class Vec4 {
	/**
	 * @param {Vec4Parameters} args
	 */
	constructor(...args) {
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
			if (args.length >= 1) this._x = args[0];
			if (args.length >= 2) this._y = args[1];
			if (args.length >= 3) this._z = args[2];
			if (args.length >= 4) this._w = args[3];
		}

		this.fireOnChange();
	}

	clone() {
		return new Vec4(this);
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

	toArray() {
		return [this.x, this.y, this.z, this.w];
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
