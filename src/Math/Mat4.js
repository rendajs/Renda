import Vec3 from "./Vec3.js";
import Quat from "./Quat.js";

export default class Mat4 {
	constructor(values = null) {
		this.values = [
			[1, 0, 0, 0],
			[0, 1, 0, 0],
			[0, 0, 1, 0],
			[0, 0, 0, 1],
		];
		this.set(values);

		this.flatArrayBufferCache = null;
	}

	set(values) {
		if (values && values.constructor === Float32Array) {
			this.values = [
				[values[0], values[1], values[2], values[3]],
				[values[4], values[5], values[6], values[7]],
				[values[8], values[9], values[10], values[11]],
				[values[12], values[13], values[14], values[15]],
			];
			return;
		}
		let flatValue = null;
		if (values instanceof Mat4) {
			flatValue = values.getFlatArray();
		} else if (Array.isArray(values) && values.length == 16) {
			flatValue = values;
		}
		if (flatValue) {
			this.values = [
				[flatValue[0], flatValue[1], flatValue[2], flatValue[3]],
				[flatValue[4], flatValue[5], flatValue[6], flatValue[7]],
				[flatValue[8], flatValue[9], flatValue[10], flatValue[11]],
				[flatValue[12], flatValue[13], flatValue[14], flatValue[15]],
			];
		} else {
			this.values = values || [
				[1, 0, 0, 0],
				[0, 1, 0, 0],
				[0, 0, 1, 0],
				[0, 0, 0, 1],
			];
		}

		this.markFlatArrayBuffersDirty();
	}

	getFlatArray() {
		return [...this.values[0], ...this.values[1], ...this.values[2], ...this.values[3]];
	}

	toArray() {
		return this.getFlatArray();
	}

	/**
	 * Same as flat array but stored in a TypedArray.
	 * The values are cached if the matrix is not changed. Making it more
	 * efficient when used for sending to the gpu for instance.
	 * @param {import("../Rendering/Renderers/WebGpuRenderer/GpuBufferHelper/WebGpuChunkedBuffer.js").AppendFormat} format
	 * @param {boolean} littleEndian
	 */
	getFlatArrayBuffer(format = "f32", littleEndian = true) {
		if (!this.flatArrayBufferCache) {
			this.flatArrayBufferCache = new Uint8Array(64);
			const dataView = new DataView(this.flatArrayBufferCache.buffer);
			let i = 0;
			for (const val of this.getFlatArray()) {
				dataView.setFloat32(i, val, littleEndian);
				i += 4;
			}
		}

		return this.flatArrayBufferCache;
	}

	markFlatArrayBuffersDirty() {
		this.flatArrayBufferCache = null;
	}

	clone() {
		return new Mat4(this);
	}

	// github.com/toji/gl-matrix/blob/6866ae93d19bbff032139941cbfe0ae68c4cdead/src/gl-matrix/mat4.js#L256
	invert() {
		const a00 = this.values[0][0]; const a01 = this.values[0][1]; const a02 = this.values[0][2]; const a03 = this.values[0][3];
		const a10 = this.values[1][0]; const a11 = this.values[1][1]; const a12 = this.values[1][2]; const a13 = this.values[1][3];
		const a20 = this.values[2][0]; const a21 = this.values[2][1]; const a22 = this.values[2][2]; const a23 = this.values[2][3];
		const a30 = this.values[3][0]; const a31 = this.values[3][1]; const a32 = this.values[3][2]; const a33 = this.values[3][3];

		const b00 = a00 * a11 - a01 * a10;
		const b01 = a00 * a12 - a02 * a10;
		const b02 = a00 * a13 - a03 * a10;
		const b03 = a01 * a12 - a02 * a11;
		const b04 = a01 * a13 - a03 * a11;
		const b05 = a02 * a13 - a03 * a12;
		const b06 = a20 * a31 - a21 * a30;
		const b07 = a20 * a32 - a22 * a30;
		const b08 = a20 * a33 - a23 * a30;
		const b09 = a21 * a32 - a22 * a31;
		const b10 = a21 * a33 - a23 * a31;
		const b11 = a22 * a33 - a23 * a32;

		// Calculate the determinant
		let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

		if (!det) {
			return null;
		}
		det = 1.0 / det;

		this.values[0][0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
		this.values[0][1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
		this.values[0][2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
		this.values[0][3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
		this.values[1][0] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
		this.values[1][1] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
		this.values[1][2] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
		this.values[1][3] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
		this.values[2][0] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
		this.values[2][1] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
		this.values[2][2] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
		this.values[2][3] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
		this.values[3][0] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
		this.values[3][1] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
		this.values[3][2] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
		this.values[3][3] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
		this.markFlatArrayBuffersDirty();
		return this;
	}

	inverse() {
		const mat = new Mat4(this);
		mat.invert();
		return mat;
	}

	getDeterminant() {
		const a00 = this.values[0][0]; const a01 = this.values[0][1]; const a02 = this.values[0][2]; const a03 = this.values[0][3];
		const a10 = this.values[1][0]; const a11 = this.values[1][1]; const a12 = this.values[1][2]; const a13 = this.values[1][3];
		const a20 = this.values[2][0]; const a21 = this.values[2][1]; const a22 = this.values[2][2]; const a23 = this.values[2][3];
		const a30 = this.values[3][0]; const a31 = this.values[3][1]; const a32 = this.values[3][2]; const a33 = this.values[3][3];

		const b00 = a00 * a11 - a01 * a10;
		const b01 = a00 * a12 - a02 * a10;
		const b02 = a00 * a13 - a03 * a10;
		const b03 = a01 * a12 - a02 * a11;
		const b04 = a01 * a13 - a03 * a11;
		const b05 = a02 * a13 - a03 * a12;
		const b06 = a20 * a31 - a21 * a30;
		const b07 = a20 * a32 - a22 * a30;
		const b08 = a20 * a33 - a23 * a30;
		const b09 = a21 * a32 - a22 * a31;
		const b10 = a21 * a33 - a23 * a31;
		const b11 = a22 * a33 - a23 * a32;

		return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
	}

	/**
	 * @param  {import("./Vec3.js").Vec3Parameters} args
	 */
	translate(...args) {
		const vec = new Vec3(...args);
		this.values[3][0] += vec.x;
		this.values[3][1] += vec.y;
		this.values[3][2] += vec.z;
		this.markFlatArrayBuffersDirty();
	}

	getTranslation() {
		return new Vec3(this.values[3]);
	}

	/**
	 * @param  {import("./Vec3.js").Vec3Parameters} args
	 */
	setTranslation(...args) {
		const vec = new Vec3(...args);
		this.values[3][0] = vec.x;
		this.values[3][1] = vec.y;
		this.values[3][2] = vec.z;
		this.markFlatArrayBuffersDirty();
	}

	// http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm
	getRotation(scale = null) {
		if (!scale) scale = this.getScale();

		let sX = scale.x;
		if (this.getDeterminant() < 0) sX = -sX;

		const m00 = this.values[0][0] / sX;
		const m01 = this.values[1][0] / sX;
		const m02 = this.values[2][0] / sX;
		const m10 = this.values[0][1] / scale.y;
		const m11 = this.values[1][1] / scale.y;
		const m12 = this.values[2][1] / scale.y;
		const m20 = this.values[0][2] / scale.z;
		const m21 = this.values[1][2] / scale.z;
		const m22 = this.values[2][2] / scale.z;

		const q = new Quat();
		const trace = m00 + m11 + m22;

		if (trace > 0) {
			const s = Math.sqrt(trace + 1) * 2;
			q.w = 0.25 * s;
			q.x = (m21 - m12) / s;
			q.y = (m02 - m20) / s;
			q.z = (m10 - m01) / s;
		} else if (m00 > m11 && m00 > m22) {
			const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
			q.w = (m21 - m12) / s;
			q.x = 0.25 * s;
			q.y = (m01 + m10) / s;
			q.z = (m02 + m20) / s;
		} else if (m11 > m22) {
			const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
			q.w = (m02 - m20) / s;
			q.x = (m01 + m10) / s;
			q.y = 0.25 * s;
			q.z = (m12 + m21) / s;
		} else {
			const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
			q.w = (m10 - m01) / s;
			q.x = (m02 + m20) / s;
			q.y = (m12 + m21) / s;
			q.z = 0.25 * s;
		}
		return q;
	}

	setRotation() {
		// todo
	}

	getScale() {
		const sx = (new Vec3(this.values[0])).magnitude;
		const sy = (new Vec3(this.values[1])).magnitude;
		const sz = (new Vec3(this.values[2])).magnitude;
		return new Vec3(sx, sy, sz);
	}

	/**
	 * @param  {import("./Vec3.js").Vec3Parameters} args
	 */
	setScale(...args) {
		const vec = new Vec3(...args);
		this.values[0][0] = vec.x;
		this.values[1][1] = vec.y;
		this.values[2][2] = vec.z;
		this.markFlatArrayBuffersDirty();
	}

	decompose() {
		const pos = this.getTranslation();
		const scale = this.getScale();
		const rot = this.getRotation(scale);
		return {pos, rot, scale};
	}

	static createDynamicAspectPerspective(fov = 90, near = 0.05, far = 1000, aspect = 1) {
		let uwMultiplier = 1;
		let uhMultiplier = 1;
		if (aspect > 1) {
			uhMultiplier = aspect;
		} else {
			uwMultiplier = 1 / aspect;
		}
		return Mat4.createPerspective(fov, near, far, uwMultiplier, uhMultiplier);
	}

	static createPerspective(fov = 90, near = 0.05, far = 1000, uwMultiplier = 1, uhMultiplier = 1) {
		const mat = new Mat4();
		let uw = 1 / Math.tan(fov * Math.PI / 360);
		let uh = uw;
		uw *= uwMultiplier;
		uh *= uhMultiplier;
		const deltaDepth = far - near;
		const depth = 1 / deltaDepth;
		mat.values[0][0] = uw;
		mat.values[1][1] = uh;
		mat.values[2][2] = far * depth;
		mat.values[3][2] = (-far * near) * depth;
		mat.values[2][3] = 1;
		mat.values[3][3] = 0;
		return mat;
	}

	static createRotationX(angle) {
		return new Mat4([
			[1, 0, 0, 0],
			[0, Math.cos(-angle), -Math.sin(-angle), 0],
			[0, Math.sin(-angle), Math.cos(-angle), 0],
			[0, 0, 0, 1],
		]);
	}

	static createRotationY(angle) {
		return new Mat4([
			[Math.cos(-angle), 0, Math.sin(-angle), 0],
			[0, 1, 0, 0],
			[-Math.sin(-angle), 0, Math.cos(-angle), 0],
			[0, 0, 0, 1],
		]);
	}

	static createRotationZ(angle) {
		return new Mat4([
			[Math.cos(-angle), -Math.sin(-angle), 0, 0],
			[Math.sin(-angle), Math.cos(-angle), 0, 0],
			[0, 0, 1, 0],
			[0, 0, 0, 1],
		]);
	}

	/**
	 * @param  {import("./Vec3.js").Vec3Parameters} args
	 */
	static createTranslation(...args) {
		const v = new Vec3(...args);
		return new Mat4([
			[1, 0, 0, 0],
			[0, 1, 0, 0],
			[0, 0, 1, 0],
			[v.x, v.y, v.z, 1],
		]);
	}

	static createPosRotScale(pos, rot, scale) {
		const x = rot.x;
		const y = rot.y;
		const z = rot.z;
		const w = rot.w;

		const x2 = x * 2;
		const y2 = y * 2;
		const z2 = z * 2;

		const xx = x * x2;
		const xy = x * y2;
		const xz = x * z2;

		const yy = y * y2;
		const yz = y * z2;

		const zz = z * z2;

		const wx = w * x2;
		const wy = w * y2;
		const wz = w * z2;

		const sx = scale.x;
		const sy = scale.y;
		const sz = scale.z;

		return new Mat4([
			[
				(1 - (yy + zz)) * sx,
				(xy + wz) * sx,
				(xz - wy) * sx,
				0,
			], [
				(xy - wz) * sy,
				(1 - (xx + zz)) * sy,
				(yz + wx) * sy,
				0,
			], [
				(xz + wy) * sz,
				(yz - wx) * sz,
				(1 - (xx + yy)) * sz,
				0,
			], [
				pos.x,
				pos.y,
				pos.z,
				1,
			],
		]);
	}

	static multiplyMatrices(a1, a2) {
		const v1 = a1.values;
		const v2 = a2.values;

		return new Mat4([
			[
				v1[0][0] * v2[0][0] + v1[0][1] * v2[1][0] + v1[0][2] * v2[2][0] + v1[0][3] * v2[3][0],
				v1[0][0] * v2[0][1] + v1[0][1] * v2[1][1] + v1[0][2] * v2[2][1] + v1[0][3] * v2[3][1],
				v1[0][0] * v2[0][2] + v1[0][1] * v2[1][2] + v1[0][2] * v2[2][2] + v1[0][3] * v2[3][2],
				v1[0][0] * v2[0][3] + v1[0][1] * v2[1][3] + v1[0][2] * v2[2][3] + v1[0][3] * v2[3][3],
			],
			[
				v1[1][0] * v2[0][0] + v1[1][1] * v2[1][0] + v1[1][2] * v2[2][0] + v1[1][3] * v2[3][0],
				v1[1][0] * v2[0][1] + v1[1][1] * v2[1][1] + v1[1][2] * v2[2][1] + v1[1][3] * v2[3][1],
				v1[1][0] * v2[0][2] + v1[1][1] * v2[1][2] + v1[1][2] * v2[2][2] + v1[1][3] * v2[3][2],
				v1[1][0] * v2[0][3] + v1[1][1] * v2[1][3] + v1[1][2] * v2[2][3] + v1[1][3] * v2[3][3],
			],
			[
				v1[2][0] * v2[0][0] + v1[2][1] * v2[1][0] + v1[2][2] * v2[2][0] + v1[2][3] * v2[3][0],
				v1[2][0] * v2[0][1] + v1[2][1] * v2[1][1] + v1[2][2] * v2[2][1] + v1[2][3] * v2[3][1],
				v1[2][0] * v2[0][2] + v1[2][1] * v2[1][2] + v1[2][2] * v2[2][2] + v1[2][3] * v2[3][2],
				v1[2][0] * v2[0][3] + v1[2][1] * v2[1][3] + v1[2][2] * v2[2][3] + v1[2][3] * v2[3][3],
			],
			[
				v1[3][0] * v2[0][0] + v1[3][1] * v2[1][0] + v1[3][2] * v2[2][0] + v1[3][3] * v2[3][0],
				v1[3][0] * v2[0][1] + v1[3][1] * v2[1][1] + v1[3][2] * v2[2][1] + v1[3][3] * v2[3][1],
				v1[3][0] * v2[0][2] + v1[3][1] * v2[1][2] + v1[3][2] * v2[2][2] + v1[3][3] * v2[3][2],
				v1[3][0] * v2[0][3] + v1[3][1] * v2[1][3] + v1[3][2] * v2[2][3] + v1[3][3] * v2[3][3],
			],
		]);
	}

	multiplyMatrix(otherMatrix) {
		const newMat = Mat4.multiplyMatrices(this, otherMatrix);
		this.values = newMat.values;
		this.markFlatArrayBuffersDirty();
	}
}
