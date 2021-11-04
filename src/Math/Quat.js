import Vec2 from "./Vec2.js";
import Vec3 from "./Vec3.js";
import Vec4 from "./Vec4.js";

/**
 * @typedef {() => Quat} quatSetEmptySignature
 * @typedef {(vec: Quat) => Quat} quatSetQuatSignature
 * @typedef {(vec: Vec2) => Quat} quatSetVec2Signature
 * @typedef {(vec: Vec3) => Quat} quatSetVec3Signature
 * @typedef {(vec: Vec4) => Quat} quatSetVec4Signature
 * @typedef {(x?: number, y?: number, z?: number, w?: number) => Quat} quatSetNumNumNumNumSignature
 * @typedef {(xyzw: number[]) => Quat} quatSetArraySignature
 * @typedef {Parameters<quatSetEmptySignature> | Parameters<quatSetQuatSignature> | Parameters<quatSetVec2Signature> | Parameters<quatSetVec3Signature> | Parameters<quatSetVec4Signature> | Parameters<quatSetNumNumNumNumSignature> | Parameters<quatSetArraySignature>} QuatParameters
 */

export default class Quat {
	/**
	 * @param {QuatParameters} args
	 */
	constructor(...args) {
		this.onChangeCbs = new Set();
		this._x = 0;
		this._y = 0;
		this._z = 0;
		this._w = 1;
		this.set(...args);
	}

	/**
	 * @param {QuatParameters} args
	 */
	set(...args) {
		if (args.length == 1) {
			const arg = args[0];
			if (arg instanceof Quat) {
				this._x = arg.x;
				this._y = arg.y;
				this._z = arg.z;
				this._w = arg.w;
			} else if (arg instanceof Vec4) {
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
		return new Quat(this);
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
		if (args.length == 1) {
			axis = args[0];
		} else if (args.length == 2) {
			axis = args[0];
			angle = args[1];
		} else if (args.length == 3) {
			axis = new Vec3(args[0], args[1], args[2]);
			angle = undefined;
		} else if (args.length == 4) {
			axis = new Vec3(args[0], args[1], args[2]);
			angle = args[3];
		}
		if (angle == undefined) {
			angle = axis.magnitude;
		}
		const vec = axis.clone();
		vec.normalize();
		if (isNaN(vec.x) || isNaN(vec.y) || isNaN(vec.z)) return new Quat();
		const s = Math.sin(angle / 2);
		const qx = vec.x * s;
		const qy = vec.y * s;
		const qz = vec.z * s;
		const qw = Math.cos(angle / 2);
		const q = new Quat(qx, qy, qz, qw);
		return q;
	}

	/**
	 * @typedef {(axis: Vec3) => this} fromAxisAngleVecSignature
	 * @typedef {(axis: Vec3, angle: number) => this} fromAxisAngleVecNumSignature
	 * @typedef {(x: number, y: number, z: number) => this} fromAxisAngleNumNumNumSignature
	 * @typedef {(x: number, y: number, z: number, angle: number) => this} fromAxisAngleNumNumNumNumSignature
	 * @typedef {Parameters<fromAxisAngleVecNumSignature> | Parameters<fromAxisAngleNumNumNumNumSignature> | Parameters<fromAxisAngleNumNumNumSignature> | Parameters<fromAxisAngleVecSignature>} FromAxisAngleParameters
	 */

	/**
	 * @param {FromAxisAngleParameters} args
	 */
	setFromAxisAngle(...args) {
		const q = Quat.fromAxisAngle(...args);
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
	/**
	 * @param  {import("./Vec3.js").Vec3Parameters} args
	 */
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

		return new Quat(qx, qy, qz, qw);
	}

	static multiplyQuaternions(q1, q2) {
		return new Quat(
			q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
			q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
			q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w,
			q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z
		);
	}

	preMultiply(q) {
		this.set(Quat.multiplyQuaternions(q, this));
		return this;
	}

	multiply(q) {
		this.set(Quat.multiplyQuaternions(this, q));
		return this;
	}

	/**
	 * @param {FromAxisAngleParameters} args
	 */
	rotateAxisAngle(...args) {
		const q = Quat.fromAxisAngle(...args);
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

	/**
	 * @param  {import("./Vec3.js").Vec3Parameters} args
	 */
	rotateVector(...args) {
		// TODO: optimise: gamedev.stackexchange.com/a/50545/87477
		const vec = new Vec3(...args);
		const pin = new Quat(vec.x, vec.y, vec.z, 1);
		const qconj = new Quat(this);
		qconj.invert();
		const pout = Quat.multiplyQuaternions(qconj, Quat.multiplyQuaternions(pin, this));
		const newVec = new Vec3(
			pout.x,
			pout.y,
			pout.z
		);
		newVec.magnitude = vec.magnitude;
		return newVec;
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
		this.onChangeCbs.forEach(cb => cb());
	}
}
