import {Mat4} from "./Mat4.js";
import {Vec2} from "./Vec2.js";
import {Vec3} from "./Vec3.js";
import {Vec4} from "./Vec4.js";

/** @typedef {(changedComponents: number) => void} OnQuatChangeCallback */

/**
 * @typedef {() => Quat} quatSetEmptySignature
 * @typedef {(vec: Quat) => Quat} quatSetQuatSignature
 * @typedef {(vec: Vec2) => Quat} quatSetVec2Signature
 * @typedef {(vec: Vec3) => Quat} quatSetVec3Signature
 * @typedef {(vec: Vec4) => Quat} quatSetVec4Signature
 * @typedef {(x?: number, y?: number, z?: number, w?: number) => Quat} quatSetNumNumNumNumSignature
 * @typedef {(xyzw: number[]) => Quat} quatSetArraySignature
 * @typedef {import("./types.js").MergeParameters<quatSetEmptySignature | quatSetQuatSignature | quatSetVec2Signature | quatSetVec3Signature | quatSetVec4Signature | quatSetNumNumNumNumSignature | quatSetArraySignature>} QuatParameters
 */

/**
 * @typedef {import("./types.js").GetFirstParam<QuatParameters>} QuatParameterSingle
 */

export class Quat {
	/**
	 * @param {QuatParameters} args
	 */
	constructor(...args) {
		/** @type {Set<OnQuatChangeCallback>} */
		this.onChangeCbs = new Set();
		this._x = 0;
		this._y = 0;
		this._z = 0;
		this._w = 1;
		this.set(...args);
	}

	static get identity() {
		return new Quat();
	}

	/**
	 * @param {QuatParameters} args
	 */
	set(...args) {
		const prevX = this._x;
		const prevY = this._y;
		const prevZ = this._z;
		const prevW = this._w;

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
			const x = args[0];
			const y = args[1];
			const z = args[2];
			const w = args[3];
			if (x != undefined) this._x = x;
			if (y != undefined) this._y = y;
			if (z != undefined) this._z = z;
			if (w != undefined) this._w = w;
		}

		let changedComponents = 0x0000;
		if (this._x != prevX) changedComponents |= 0x1000;
		if (this._y != prevY) changedComponents |= 0x0100;
		if (this._z != prevZ) changedComponents |= 0x0010;
		if (this._w != prevW) changedComponents |= 0x0001;
		if (changedComponents != 0x0000) this.fireOnChange(changedComponents);
		return this;
	}

	clone() {
		return new Quat(this);
	}

	get x() {
		return this._x;
	}
	set x(value) {
		this._x = value;
		this.fireOnChange(0x1000);
	}

	get y() {
		return this._y;
	}
	set y(value) {
		this._y = value;
		this.fireOnChange(0x0100);
	}

	get z() {
		return this._z;
	}
	set z(value) {
		this._z = value;
		this.fireOnChange(0x0010);
	}

	get w() {
		return this._w;
	}
	set w(value) {
		this._w = value;
		this.fireOnChange(0x0001);
	}

	/**
	 * @param {FromAxisAngleParameters} args
	 */
	static fromAxisAngle(...args) {
		/** @type {Vec3} */
		let axis;
		/** @type {number | undefined} */
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
		} else {
			throw new Error("Invalid arguments");
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
	 * @typedef {import("./types.js").MergeParameters<fromAxisAngleVecNumSignature | fromAxisAngleNumNumNumNumSignature | fromAxisAngleNumNumNumSignature | fromAxisAngleVecSignature>} FromAxisAngleParameters
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

	toMat4() {
		// https://github.com/toji/gl-matrix/blob/6866ae93d19bbff032139941cbfe0ae68c4cdead/src/gl-matrix/mat4.js#L1186
		const x2 = this.x + this.x;
		const y2 = this.y + this.y;
		const z2 = this.z + this.z;

		const xx = this.x * x2;
		const yx = this.y * x2;
		const yy = this.y * y2;
		const zx = this.z * x2;
		const zy = this.z * y2;
		const zz = this.z * z2;
		const wx = this.w * x2;
		const wy = this.w * y2;
		const wz = this.w * z2;

		return new Mat4([
			[1 - yy - zz, yx + wz, zx - wy, 0],
			[yx - wz, 1 - xx - zz, zy + wx, 0],
			[zx + wy, zy - wx, 1 - xx - yy, 0],
			[0, 0, 0, 1],
		]);
	}

	// http://www.euclideanspace.com/maths/geometry/rotations/conversions/eulerToQuaternion/index.htm
	/**
	 * @param {import("./Vec3.js").Vec3Parameters} args
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

	/**
	 * @param {Quat} q1
	 * @param {Quat} q2
	 */
	static multiplyQuaternions(q1, q2) {
		return new Quat(
			q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
			q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
			q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w,
			q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z
		);
	}

	/**
	 * @param {Quat} q
	 */
	preMultiply(q) {
		this.set(Quat.multiplyQuaternions(q, this));
		return this;
	}

	/**
	 * @param {Quat} q
	 */
	multiply(q) {
		this.set(Quat.multiplyQuaternions(this, q));
		return this;
	}

	/**
	 * @param {FromAxisAngleParameters} args
	 */
	rotateAxisAngle(...args) {
		const q = Quat.fromAxisAngle(...args);
		this.preMultiply(q);
		return this;
	}

	invert() {
		this.set(-this.x, -this.y, -this.z, this.w);
		return this;
	}

	inverse() {
		return this.clone().invert();
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
		const result = new Quat(vec.x, vec.y, vec.z, 1);
		const conjugate = new Quat(this).invert();
		result.preMultiply(this);
		result.multiply(conjugate);
		const newVec = new Vec3(
			result.x,
			result.y,
			result.z
		);
		return newVec;
	}

	toArray() {
		return [this.x, this.y, this.z, this.w];
	}

	/**
	 * @param {OnQuatChangeCallback} cb
	 */
	onChange(cb) {
		this.onChangeCbs.add(cb);
	}

	/**
	 * @param {OnQuatChangeCallback} cb
	 */
	removeOnChange(cb) {
		this.onChangeCbs.delete(cb);
	}

	/**
	 * @private
	 * @param {number} changedComponents
	 */
	fireOnChange(changedComponents) {
		this.onChangeCbs.forEach(cb => cb(changedComponents));
	}
}
