import Mat4 from "./Mat4.js";
import Vec2 from "./Vec2.js";
import Vec4 from "./Vec4.js";

export default class Vec3 {
	/**
	 * @param {number | Vec2 | Vec3 | Vec4 | number[]} x
	 * @param {number} y
	 * @param {number} z
	 */
	constructor(x = 0, y = 0, z = 0) {
		this.onChangeCbs = new Set();
		this._x = 0;
		this._y = 0;
		this._z = 0;
		this.set(x, y, z);
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
	get y() {
		return this._y;
	}
	get z() {
		return this._z;
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

	/**
	 * @param {number | Vec2 | Vec3 | Vec4 | number[]} x
	 * @param {number} y
	 * @param {number} z
	 */
	set(x = 0, y = 0, z = 0) {
		if (x instanceof Vec3 || x instanceof Vec4) {
			const vector = x;
			x = vector.x;
			y = vector.y;
			z = vector.z;
		} else if (x instanceof Vec2) {
			const vector = x;
			x = vector.x;
			y = vector.y;
			z = 0;
		} else if (Array.isArray(x)) {
			const vector = x;
			x = vector[0];
			y = vector[1];
			z = vector[2];
		}

		this._x = x;
		this._y = y;
		this._z = z;
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

	multiply(vectorScalarOrMatrix) {
		if (vectorScalarOrMatrix instanceof Vec4 || vectorScalarOrMatrix instanceof Vec3 || arguments.length == 4 || arguments.length == 3) {
			return this.multiplyVector(new Vec3(...arguments));
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
		this.fireOnChange();
		return this;
	}

	multiplyVector(vector) {
		this._x *= vector.x;
		this._y *= vector.y;
		this._z *= vector.z;
		this.fireOnChange();
		return this;
	}

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

	divide(vectorOrScalar) {
		if (vectorOrScalar instanceof Vec4 || vectorOrScalar instanceof Vec3 || arguments.length == 4 || arguments.length == 3) {
			return this.divideVector(new Vec3(...arguments));
		} else {
			return this.divideScalar(vectorOrScalar);
		}
	}

	divideVector(vector) {
		this._x /= vector.x;
		this._y /= vector.y;
		this._z /= vector.z;
		this.fireOnChange();
		return this;
	}

	divideScalar(scalar) {
		this._x /= scalar;
		this._y /= scalar;
		this._z /= scalar;
		this.fireOnChange();
		return this;
	}

	add(vectorOrScalar) {
		if (vectorOrScalar instanceof Vec4 || vectorOrScalar instanceof Vec3 || arguments.length == 4 || arguments.length == 3) {
			return this.addVector(new Vec3(...arguments));
		} else {
			return this.addScalar(vectorOrScalar);
		}
	}

	addScalar(scalar) {
		this._x += scalar;
		this._y += scalar;
		this._z += scalar;
		this.fireOnChange();
		return this;
	}

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
