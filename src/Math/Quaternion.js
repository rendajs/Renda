import Vec3 from "./Vec3.js";

export default class Quaternion {
	/**
	 * @param {number | Quaternion} x
	 * @param {number} y
	 * @param {number} z
	 * @param {number} w
	 */
	constructor(x = 0, y = 0, z = 0, w = 1) {
		this.onChangeCbs = [];
		this._x = 0;
		this._y = 0;
		this._z = 0;
		this._w = 1;
		this.set(x, y, z, w);
	}

	/**
	 * @param {number | Quaternion} x
	 * @param {number} y
	 * @param {number} z
	 * @param {number} w
	 */
	set(x = 0, y = 0, z = 0, w = 1) {
		if (x instanceof Quaternion) {
			const q = x;
			x = q.x;
			y = q.y;
			z = q.z;
			w = q.w;
		}

		this._x = x;
		this._y = y;
		this._z = z;
		this._w = w;
		this.fireOnChange();
	}

	clone() {
		return new Quaternion(this);
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
	 * @param {FromAxisAngleParameters} args
	 */
	static fromAxisAngle(...args) {
		/** @type {Vec3} */
		let axis;
		/** @type {number} */
		let angle;
		if (args.length == 4) {
			axis = new Vec3(args[0], args[1], args[2]);
			angle = args[3];
		} else if (args.length == 3) {
			axis = new Vec3(args[0], args[1], args[2]);
			angle = undefined;
		}
		if (angle == undefined) {
			angle = axis.magnitude;
		}
		const vec = axis.clone();
		vec.normalize();
		if (isNaN(vec.x) || isNaN(vec.y) || isNaN(vec.z)) return new Quaternion();
		const s = Math.sin(angle / 2);
		const qx = vec.x * s;
		const qy = vec.y * s;
		const qz = vec.z * s;
		const qw = Math.cos(angle / 2);
		const q = new Quaternion(qx, qy, qz, qw);
		return q;
	}

	/**
	 * @typedef {(axis: Vec3, angle: number) => this} fromAxisAngleVecNumSignature
	 * @typedef {(x: number, y: number, z: number, angle: number) => this} fromAxisAngleNumNumNumNumSignature
	 * @typedef {(x: number, y: number, z: number) => this} fromAxisAngleNumNumNumSignature
	 * @typedef {(axis: Vec3) => this} fromAxisAngleVecSignature
	 * @typedef {Parameters<fromAxisAngleVecNumSignature> | Parameters<fromAxisAngleNumNumNumNumSignature> | Parameters<fromAxisAngleNumNumNumSignature> | Parameters<fromAxisAngleVecSignature>} FromAxisAngleParameters
	 */

	/**
	 * @param {FromAxisAngleParameters} args
	 */
	setFromAxisAngle(...args) {
		const q = Quaternion.fromAxisAngle(...args);
		this.set(q);
		return this;
	}

	toAxisAngle() {
		const q = this.clone();
		if (q.w > 1) q.normalize();
		const angle = 2 * Math.acos(q.w);
		const s = Math.sqrt(1 - q.w * q.w);
		const x = q.x / s;
		const y = q.y / s;
		const z = q.z / s;
		const vec = new Vec3(x, y, z);
		vec.magnitude = angle;
		return vec;
	}

	// http://www.euclideanspace.com/maths/geometry/rotations/conversions/eulerToQuaternion/index.htm
	static fromEuler(...args) {
		const vec = new Vec3(...args);

		const c1 = Math.cos(vec.y / 2);
		const c2 = Math.cos(vec.z / 2);
		const c3 = Math.cos(vec.x / 2);
		const s1 = Math.sin(vec.y / 2);
		const s2 = Math.sin(vec.z / 2);
		const s3 = Math.sin(vec.x / 2);

		const qx = c1 * c2 * s3 + s1 * s2 * c3;
		const qy = s1 * c2 * c3 + c1 * s2 * s3;
		const qz = c1 * s2 * c3 - s1 * c2 * s3;
		const qw = c1 * c2 * c3 - s1 * s2 * s3;

		return new Quaternion(qx, qy, qz, qw);
	}

	static multiplyQuaternions(q1, q2) {
		return new Quaternion(
			q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
			q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
			q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w,
			q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z
		);
	}

	preMultiply(q) {
		this.set(Quaternion.multiplyQuaternions(q, this));
		return this;
	}

	multiply(q) {
		this.set(Quaternion.multiplyQuaternions(this, q));
		return this;
	}

	/**
	 * @param {FromAxisAngleParameters} args
	 */
	rotateAxisAngle(...args) {
		const q = Quaternion.fromAxisAngle(...args);
		this.multiply(q);
		return this;
	}

	invert() {
		this.set(-this.x, -this.y, -this.z, this.w);
		return this;
	}

	normalize() {
		const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
		this.x /= length;
		this.y /= length;
		this.z /= length;
		this.w /= length;
		return this;
	}

	rotateVector(...args) {
		// TODO: optimise: gamedev.stackexchange.com/a/50545/87477
		const vec = new Vec3(...args);
		const pin = new Quaternion(vec.x, vec.y, vec.z, 1);
		const qconj = new Quaternion(this);
		qconj.invert();
		const pout = Quaternion.multiplyQuaternions(qconj, Quaternion.multiplyQuaternions(pin, this));
		const newVec = new Vec3(
			pout.x,
			pout.y,
			pout.z
		);
		newVec.magnitude = vec.magnitude;
		return newVec;
	}

	onChange(cb) {
		this.onChangeCbs.push(cb);
	}

	removeOnChange(cb) {
		const index = this.onChangeCbs.indexOf(cb);
		if (index >= 0) {
			this.onChangeCbs.splice(index, 1);
		}
	}

	fireOnChange() {
		for (const cb of this.onChangeCbs) {
			cb();
		}
	}
}
