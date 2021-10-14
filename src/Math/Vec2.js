import Vec3 from "./Vec3.js";
import Vec4 from "./Vec4.js";

export default class Vec2 {
	/**
	 * @param {Vec2SetParameters} args
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
	 * @typedef {Parameters<vec2SetEmptySignature> | Parameters<vec2SetVec2Signature> | Parameters<vec2SetVec3Signature> | Parameters<vec2SetVec4Signature> | Parameters<vec2SetNumNumSignature> | Parameters<vec2SetArraySignature>} Vec2SetParameters
	 */

	/**
	 * @param {Vec2SetParameters} args
	 */
	set(...args) {
		if (args.length == 0) {
			this._x = 0;
			this._y = 0;
		} else if (args.length == 1) {
			const arg = args[0];
			if (arg instanceof Vec2 || arg instanceof Vec3 || arg instanceof Vec4) {
				this._x = arg.x;
				this._y = arg.y;
			} else if (Array.isArray(arg)) {
				if (args.length >= 1) this._x = arg[0];
				if (args.length >= 2) this._y = arg[1];
			}
		} else if (args.length == 2) {
			this._x = args[0];
			this._y = args[1];
		}

		this.fireOnChange();
	}

	clone() {
		return new Vec2(this);
	}

	/**
	 * @param {Parameters<typeof this.multiplyScalar> | Vec2SetParameters} args
	 */
	multiply(...args) {
		if (args.length == 1 && typeof args[0] == "number") {
			return this.multiplyScalar(args[0]);
		} else {
			const castArgs = /** @type {Vec2SetParameters} */ (args);
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
	 * @param {Parameters<typeof this.addScalar> | Vec2SetParameters} args
	 */
	add(...args) {
		if (args.length == 1 && typeof args[0] == "number") {
			return this.addScalar(args[0]);
		} else {
			const castArgs = /** @type {Vec2SetParameters} */ (args);
			return this.addVector(new Vec2(...castArgs));
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
		this.fireOnChange();
		return this;
	}

	/**
	 * Adds components to their respective components.
	 * @param {Vec2} vector
	 * @returns {this}
	 */
	addVector(vector) {
		this._x += vector.x;
		this._y += vector.y;
		this.fireOnChange();
		return this;
	}

	toArray() {
		return [this.x, this.y];
	}

	fireOnChange() {
		for (const cb of this.onChangeCbs) {
			cb();
		}
	}
}
