import {Vec3} from "./Vec3.js";
import {Vec4} from "./Vec4.js";

export class Vec2 {
	/**
	 * @param {Vec2Parameters} args
	 */
	constructor(...args) {
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
		this.fireOnChange();
	}

	get y() {
		return this._y;
	}
	set y(value) {
		this._y = value;
		this.fireOnChange();
	}

	/**
	 * @typedef {() => this} vec2SetEmptySignature
	 * @typedef {(vec: Vec2) => this} vec2SetVec2Signature
	 * @typedef {(vec: Vec3) => this} vec2SetVec3Signature
	 * @typedef {(vec: Vec4) => this} vec2SetVec4Signature
	 * @typedef {(x: number, y: number) => this} vec2SetNumNumSignature
	 * @typedef {(xy: number[]) => this} vec2SetArraySignature
	 * @typedef {import("./types.js").MergeParameters<vec2SetEmptySignature | vec2SetVec2Signature | vec2SetVec3Signature | vec2SetVec4Signature | vec2SetNumNumSignature | vec2SetArraySignature>} Vec2Parameters
	 */

	/**
	 * @param {Vec2Parameters} args
	 */
	set(...args) {
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

		this.fireOnChange();
	}

	clone() {
		return new Vec2(this);
	}

	get magnitude() {
		return Math.sqrt(this.x ** 2 + this.y ** 2);
	}

	set magnitude(value) {
		const diff = value / this.magnitude;
		if (diff == 1) return;
		this._x *= diff;
		this._y *= diff;
		if (isNaN(this.x)) this._x = 0;
		if (isNaN(this.y)) this._y = 0;
		this.fireOnChange();
	}

	normalize() {
		this.magnitude = 1;
		return this;
	}

	/**
	 * @param {Vec2Parameters} otherVec
	 */
	distanceTo(...otherVec) {
		const other = new Vec2(...otherVec);
		other.sub(this);
		return other.magnitude;
	}

	/**
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
	 * Multiplies components by a scalar.
	 * @param {number} scalar
	 * @returns {this}
	 */
	multiplyScalar(scalar) {
		this._x *= scalar;
		this._y *= scalar;
		this.fireOnChange();
		return this;
	}

	/**
	 * Multiplies components by the value of their respective components.
	 * @param {Vec2} vector
	 * @returns {this}
	 */
	multiplyVector(vector) {
		this._x *= vector.x;
		this._y *= vector.y;
		this.fireOnChange();
		return this;
	}

	/**
	 * If a single number is provided, adds the number to each component.
	 * Otherwise the arguments are converted to a Vector and each of its
	 * components are added to this vector.
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
	 * Adds a scalar to each component.
	 * @param {number} scalar
	 */
	addScalar(scalar) {
		this._x += scalar;
		this._y += scalar;
		this.fireOnChange();
		return this;
	}

	/**
	 * Adds components to their respective components.
	 * @param {Vec2} vector
	 */
	addVector(vector) {
		this._x += vector.x;
		this._y += vector.y;
		this.fireOnChange();
		return this;
	}

	/**
	 * If a single number is provided, subtracts the number from each component.
	 * Otherwise the arguments are converted to a Vector and each of its
	 * components are subtracted from this vector.
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
	 * Subtracts a scalar from each component.
	 * @param {number} scalar
	 */
	subScalar(scalar) {
		this._x -= scalar;
		this._y -= scalar;
		this.fireOnChange();
		return this;
	}

	/**
	 * Subtracts components from their respective components.
	 * @param {Vec2} vector
	 */
	subVector(vector) {
		this._x -= vector.x;
		this._y -= vector.y;
		this.fireOnChange();
		return this;
	}

	toArray() {
		return [this.x, this.y];
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
