import Vec2 from "./Vec2.js";
import Vec3 from "./Vec3.js";
import Mat4 from "./Mat4.js";

export default class Vec4 {
	/**
	 * @param {number | Vec3 | Vec4 | number[]} x
	 * @param {number} y
	 * @param {number} z
	 * @param {number} w
	 */
	constructor(x = 0, y = 0, z = 0, w = 1) {
		this.onChangeCbs = new Set();
		this._x = 0;
		this._y = 0;
		this._z = 0;
		this._w = 1;
		this.set(x, y, z, w);
	}

	get x() {
		return this._x;
	}
	get y() {
		return this._y;
	}
	get z() {
		return this._z;
	}
	get w() {
		return this._w;
	}

	set x(value) {
		this._x = value;
		this.fireOnChange();
	}
	set y(value) {
		this._y = value;
		this.fireOnChange();
	}
	set z(value) {
		this._z = value;
		this.fireOnChange();
	}
	set w(value) {
		this._w = value;
		this.fireOnChange();
	}

	/**
	 * @param {number | Vec2 | Vec3 | Vec4 | number[]} x
	 * @param {number} y
	 * @param {number} z
	 * @param {number} w
	 */
	set(x = 0, y = 0, z = 0, w = 0) {
		if (x instanceof Vec4) {
			const vector = x;
			x = vector.x;
			y = vector.y;
			z = vector.z;
		} else if (x instanceof Vec3) {
			const vector = x;
			x = vector.x;
			y = vector.y;
			z = vector.z;
			w = 1;
		} else if (x instanceof Vec2) {
			const vector = x;
			x = vector.x;
			y = vector.y;
			z = 0;
			w = 1;
		} else if (Array.isArray(x)) {
			const vector = x;
			x = vector[0];
			y = vector[1];
			z = vector[2];
		}

		this._x = x;
		this._y = y;
		this._z = z;
		this._w = w;
		this.fireOnChange();
	}

	clone() {
		return new Vec4(this);
	}

	multiply(vectorScalarOrMatrix) {
		if (vectorScalarOrMatrix instanceof Vec4 || vectorScalarOrMatrix instanceof Vec3 || arguments.length == 4 || arguments.length == 3) {
			return this.multiplyVector(new Vec4(...arguments));
		} else if (vectorScalarOrMatrix instanceof Mat4) {
			return this.multiplyMatrix(vectorScalarOrMatrix);
		} else {
			return this.multiplyScalar(vectorScalarOrMatrix);
		}
	}

	multiplyScalar(scalar) {
		this._x *= scalar;
		this._y *= scalar;
		this._z *= scalar;
		this._w *= scalar;
		this.fireOnChange();
		return this;
	}

	multiplyVector(vector) {
		this._x *= vector.x;
		this._y *= vector.y;
		this._z *= vector.z;
		this._w *= vector.w;
		this.fireOnChange();
		return this;
	}

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
	}

	divide(vectorOrScalar) {
		if (vectorOrScalar instanceof Vec4 || vectorOrScalar instanceof Vec3 || arguments.length == 4 || arguments.length == 3) {
			return this.divideVector(new Vec4(...arguments));
		} else {
			return this.divideScalar(vectorOrScalar);
		}
	}

	divideVector(vector) {
		this._x /= vector.x;
		this._y /= vector.y;
		this._z /= vector.z;
		this._w /= vector.w;
		this.fireOnChange();
		return this;
	}

	divideScalar(scalar) {
		this._x /= scalar;
		this._y /= scalar;
		this._z /= scalar;
		this._w /= scalar;
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
