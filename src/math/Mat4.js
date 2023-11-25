import {Vec3} from "./Vec3.js";
import {Quat} from "./Quat.js";

/**
 * @typedef {() => Mat4} mat4SetEmptySignature
 * @typedef {(buffer: Float32Array) => Mat4} mat4SetFloat32ArraySignature
 * @typedef {(mat: Mat4) => Mat4} mat4SetMat4Signature
 * @typedef {(mat: number[]) => Mat4} mat4SetNumArraySignature
 * @typedef {(mat: number[][]) => Mat4} mat4SetNumArrayArraySignature
 * @typedef {import("./MathTypes.js").MergeParameters<mat4SetEmptySignature | mat4SetFloat32ArraySignature | mat4SetMat4Signature | mat4SetNumArraySignature | mat4SetNumArrayArraySignature>} Mat4Parameters
 */

/**
 * @typedef {import("./MathTypes.js").GetFirstParam<Mat4Parameters>} Mat4ParameterSingle
 */

export class Mat4 {
	/** @typedef {[number,number,number,number]} RowArray */
	/** @typedef {[RowArray,RowArray,RowArray,RowArray]} ColumnArray */
	/**
	 * @param {Mat4Parameters} args
	 */
	constructor(...args) {
		/** @type {ColumnArray} */
		this.values = [
			[1, 0, 0, 0],
			[0, 1, 0, 0],
			[0, 0, 1, 0],
			[0, 0, 0, 1],
		];

		/** @private @type {Set<() => void>} */
		this._onChangeCbs = new Set();

		this.set(...args);

		/** @type {Map<string, Uint8Array>} */
		this.flatArrayBufferCache = new Map();
	}

	/**
	 * @param {() => void} cb
	 */
	onChange(cb) {
		this._onChangeCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	removeOnChange(cb) {
		this._onChangeCbs.delete(cb);
	}

	/**
	 * @private
	 */
	_handleChange() {
		this.flatArrayBufferCache = new Map();
		this._onChangeCbs.forEach(cb => cb());
	}

	/**
	 * @param {Mat4Parameters} args
	 */
	set(...args) {
		const values = args[0];
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
			flatValue = /** @type {number[]} */ (values);
		}
		if (flatValue) {
			this.values = [
				[flatValue[0], flatValue[1], flatValue[2], flatValue[3]],
				[flatValue[4], flatValue[5], flatValue[6], flatValue[7]],
				[flatValue[8], flatValue[9], flatValue[10], flatValue[11]],
				[flatValue[12], flatValue[13], flatValue[14], flatValue[15]],
			];
		} else {
			if (values) {
				let validArray = false;
				if (Array.isArray(values) && values.length == 4) {
					validArray = true;
					for (let i = 0; i < 4; i++) {
						const row = values[i];
						if (!Array.isArray(row) || row.length != 4) {
							validArray = false;
							break;
						}
					}
				}
				if (!validArray) {
					throw new TypeError("Invalid Matrix constructor argument, array must be a 16 element array or a 4x4 array.");
				}
			}
			const castValues = /** @type {ColumnArray} */ (values);
			this.values = castValues || [
				[1, 0, 0, 0],
				[0, 1, 0, 0],
				[0, 0, 1, 0],
				[0, 0, 0, 1],
			];
		}

		this._handleChange();
		return this;
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
	 * @param {import("../rendering/renderers/webGpu/bufferHelper/WebGpuChunkedBuffer.js").AppendFormat} format
	 * @param {boolean} littleEndian
	 */
	getFlatArrayBuffer(format = "f32", littleEndian = true) {
		let cacheKey = format;
		if (littleEndian) cacheKey += "LE";
		let buffer = this.flatArrayBufferCache.get(cacheKey);
		if (!buffer) {
			buffer = new Uint8Array(64);
			this.flatArrayBufferCache.set(cacheKey, buffer);
			const dataView = new DataView(buffer.buffer);
			let i = 0;
			for (const val of this.getFlatArray()) {
				switch (format) {
					case "f32":
					default:
						dataView.setFloat32(i, val, littleEndian);
						break;
					case "i32":
						dataView.setInt32(i, val, littleEndian);
						break;
					case "u32":
						dataView.setUint32(i, val, littleEndian);
						break;
				}

				i += 4;
			}
		}

		return buffer;
	}

	clone() {
		return new Mat4(this);
	}

	/**
	 * Inverts this matrix without creating a new instance.
	 */
	invert() {
		// github.com/toji/gl-matrix/blob/6866ae93d19bbff032139941cbfe0ae68c4cdead/src/gl-matrix/mat4.js#L256
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
			return this;
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
		this._handleChange();
		return this;
	}

	/**
	 * Creates and returns a new matrix that is the inverse of this matrix.
	 */
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
		this._handleChange();
		return this;
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
		this._handleChange();
		return this;
	}

	// http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm
	/**
	 * @param {Vec3} [scale]
	 */
	getRotation(scale) {
		if (!scale) scale = this.getScale();

		let sX = scale.x;
		if (this.getDeterminant() < 0) sX = -sX;

		let m00 = this.values[0][0]; let m10 = this.values[0][1]; let m20 = this.values[0][2];
		let m01 = this.values[1][0]; let m11 = this.values[1][1]; let m21 = this.values[1][2];
		let m02 = this.values[2][0]; let m12 = this.values[2][1]; let m22 = this.values[2][2];

		const invSX = 1 / sX;
		const invSY = 1 / scale.y;
		const invSZ = 1 / scale.z;

		m00 *= invSX; m10 *= invSX; m20 *= invSX;
		m01 *= invSY; m11 *= invSY; m21 *= invSY;
		m02 *= invSZ; m12 *= invSZ; m22 *= invSZ;

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
		this._handleChange();
		return this;
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

	/**
	 * @param {number} angle
	 */
	static createRotationX(angle) {
		return new Mat4([
			[1, 0, 0, 0],
			[0, Math.cos(-angle), -Math.sin(-angle), 0],
			[0, Math.sin(-angle), Math.cos(-angle), 0],
			[0, 0, 0, 1],
		]);
	}

	/**
	 * @param {number} angle
	 */
	static createRotationY(angle) {
		return new Mat4([
			[Math.cos(-angle), 0, Math.sin(-angle), 0],
			[0, 1, 0, 0],
			[-Math.sin(-angle), 0, Math.cos(-angle), 0],
			[0, 0, 0, 1],
		]);
	}

	/**
	 * @param {number} angle
	 */
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

	/**
	 * @param  {import("./Vec3.js").Vec3Parameters} args
	 */
	static createScale(...args) {
		const v = new Vec3(...args);
		return new Mat4([
			[v.x, 0, 0, 0],
			[0, v.y, 0, 0],
			[0, 0, v.z, 0],
			[0, 0, 0, 1],
		]);
	}

	/**
	 * @param {Vec3} pos
	 * @param {Quat} rot
	 * @param {Vec3} scale
	 */
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

	/* eslint-disable jsdoc/no-multi-asterisks */
	/**
	 * Multiplies two matrices and returns a new instance with the result.
	 * The order of the two matrices is important.
	 * To make a mental model of what multiplying two matrices will result in,
	 * you can imagine the first parameter being the matrix of a child entity,
	 * and the second parameter being the matrix of a parent entity. The returned
	 * result will be the transformation of the child.
	 *
	 * For instance, say you have matrixA which contains a translation, and matrixB
	 * which contains a rotation. And then you perform `multiplyMatrices(matrixA, matrixB)`,
	 * it will be as if a point in space is translated first, and then rotated around the world center.
	 *
	 * matrixA:
	 * ```none
	 *  |
	 *  * translation
	 *  ^
	 *  |
	 *  |
	 *  +---------
	 * ```
	 *
	 * matrixB:
	 * ```none
	 *  |
	 *  | --_
	 *  |    `.  rotation
	 *  |      \
	 *  |      V
	 *  +------*--
	 * ```
	 *
	 * result:
	 * ```none
	 *  |
	 *  |
	 *  |
	 *  |
	 *  |     result
	 *  +-------*---
	 * ```
	 *
	 * In this case we are transforming a point using two steps (2 matrices). But
	 * if you want to use the mental model of parent and child entities, you need
	 * to reverse these two steps. So in the example above, the parent would
	 * be matrixB, and the child matrixA.
	 *
	 * @param {Mat4} a1
	 * @param {Mat4} a2
	 */
	static multiplyMatrices(a1, a2) {
		/* eslint-enable jsdoc/no-multi-asterisks */
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

	/**
	 * Multiplies this matrix with the provided one and changes the value of this instance.
	 * @param {Mat4} otherMatrix
	 */
	multiplyMatrix(otherMatrix) {
		const newMat = Mat4.multiplyMatrices(this, otherMatrix);
		this.values = newMat.values;
		this._handleChange();
		return this;
	}

	/**
	 * Multiplies the provided with this matrix one and changes the value of this instance.
	 * This is similar to {@linkcode multiplyMatrix} except that the order of the matrices is different.
	 * For more info about the order of matrix multiplications see {@linkcode multiplyMatrices}.
	 * @param {Mat4} otherMatrix
	 */
	premultiplyMatrix(otherMatrix) {
		const newMat = Mat4.multiplyMatrices(otherMatrix, this);
		this.values = newMat.values;
		this._handleChange();
		return this;
	}

	/**
	 * @param {Mat4} otherMatrix
	 */
	equals(otherMatrix) {
		const values1 = this.getFlatArray();
		const values2 = otherMatrix.getFlatArray();

		if (values1.length != values2.length) return false;

		for (let i = 0; i < values1.length; i++) {
			const v1 = values1[i];
			const v2 = values2[i];
			if (v1 != v2) return false;
		}
		return true;
	}

	isIdentity() {
		return this.equals(new Mat4());
	}
}
