import Vec3 from "./Vec3.js";
import Vec4 from "./Vec4.js";

export default class Vec2 {
	/**
	 * @param {number | Vec2 | Vec3 | Vec4 | number[]} x
	 * @param {number} y
	 */
	constructor(x = 0, y = 0) {
		this.onChangeCbs = new Set();
		this._x = 0;
		this._y = 0;
		this.set(x, y);
	}

	get x() {
		return this._x;
	}
	get y() {
		return this._y;
	}

	set x(value) {
		this._x = value;
		this.fireOnChange();
	}
	set y(value) {
		this._y = value;
		this.fireOnChange();
	}

	/**
	 * @param {number | Vec2 | Vec3 | Vec4 | number[]} x
	 * @param {number} y
	 */
	set(x = 0, y = 0) {
		if (x instanceof Vec2 || x instanceof Vec3 || x instanceof Vec4) {
			const vector = x;
			x = vector.x;
			y = vector.y;
		} else if (Array.isArray(x)) {
			const vector = x;
			x = vector[0];
			y = vector[1];
		}

		this._x = x;
		this._y = y;
		this.fireOnChange();
	}

	clone() {
		return new Vec2(this);
	}

	multiply(vectorOrScalar) {
		if (vectorOrScalar instanceof Vec2 || arguments.length == 3) {
			return this.multiplyVector(new Vec2(...arguments));
		} else {
			return this.multiplyScalar(vectorOrScalar);
		}
	}

	multiplyScalar(scalar) {
		this._x *= scalar;
		this._y *= scalar;
		this.fireOnChange();
		return this;
	}

	multiplyVector(vector) {
		this._x *= vector.x;
		this._y *= vector.y;
		this.fireOnChange();
		return this;
	}

	add(vectorOrScalar) {
		if (vectorOrScalar instanceof Vec2 || arguments.length == 3) {
			return this.addVector(new Vec2(...arguments));
		} else {
			return this.addScalar(vectorOrScalar);
		}
	}

	addScalar(scalar) {
		this._x += scalar;
		this._y += scalar;
		this.fireOnChange();
		return this;
	}

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
