import Vector3 from "./Vector3.js";

export default class Mat4{
	constructor(values){
		if(values && values.constructor === Float32Array){
			this.values = [
				[values[0],  values[1],  values[2],  values[3] ],
				[values[4],  values[5],  values[6],  values[7] ],
				[values[8],  values[9],  values[10], values[11]],
				[values[12], values[13], values[14], values[15]],
			];
		}else if(values instanceof Mat4){
			const glValue = values.glValue;
			this.values = [
				[glValue[0],  glValue[1],  glValue[2],  glValue[3] ],
				[glValue[4],  glValue[5],  glValue[6],  glValue[7] ],
				[glValue[8],  glValue[9],  glValue[10], glValue[11]],
				[glValue[12], glValue[13], glValue[14], glValue[15]],
			];
		}else{
			this.values = values || [
				[1,0,0,0],
				[0,1,0,0],
				[0,0,1,0],
				[0,0,0,1],
			];
		}
	}

	get glValue(){
		return [...this.values[0],...this.values[1],...this.values[2],...this.values[3]];
	}

	//github.com/toji/gl-matrix/blob/6866ae93d19bbff032139941cbfe0ae68c4cdead/src/gl-matrix/mat4.js#L256
	invert(){
		let a00 = this.values[0][0], a01 = this.values[0][1], a02 = this.values[0][2], a03 = this.values[0][3];
		let a10 = this.values[1][0], a11 = this.values[1][1], a12 = this.values[1][2], a13 = this.values[1][3];
		let a20 = this.values[2][0], a21 = this.values[2][1], a22 = this.values[2][2], a23 = this.values[2][3];
		let a30 = this.values[3][0], a31 = this.values[3][1], a32 = this.values[3][2], a33 = this.values[3][3];

		let b00 = a00 * a11 - a01 * a10;
		let b01 = a00 * a12 - a02 * a10;
		let b02 = a00 * a13 - a03 * a10;
		let b03 = a01 * a12 - a02 * a11;
		let b04 = a01 * a13 - a03 * a11;
		let b05 = a02 * a13 - a03 * a12;
		let b06 = a20 * a31 - a21 * a30;
		let b07 = a20 * a32 - a22 * a30;
		let b08 = a20 * a33 - a23 * a30;
		let b09 = a21 * a32 - a22 * a31;
		let b10 = a21 * a33 - a23 * a31;
		let b11 = a22 * a33 - a23 * a32;

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
		return this;
	}

	translate(x,y,z){
		if(arguments[0] instanceof Vector3){
			let vec = arguments[0];
			x = vec.x;
			y = vec.y;
			z = vec.z;
		}
		this.values[3][0] += x;
		this.values[3][1] += y;
		this.values[3][2] += z;
	}

	static createProjection(fov, screenWidth, screenHeight, near, far){
		const mat = new Mat4();
		let uw = 1 / Math.tan(fov/2);
		let uh = uw;
		const aspect = screenWidth / screenHeight;
		if(screenWidth > screenHeight){
			uh = uh * aspect;
		}else{
			uw = uw / aspect;
		}
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

	static createRotationX(angle){
		return new Mat4([
			[1, 0,                 0,                0],
			[0, Math.cos(-angle), -Math.sin(-angle), 0],
			[0, Math.sin(-angle),  Math.cos(-angle), 0],
			[0, 0,                 0,                1],
		]);
	}

	static createRotationY(angle){
		return new Mat4([
			[Math.cos(-angle),  0, Math.sin(-angle), 0],
			[0,                 1, 0,                0],
			[-Math.sin(-angle), 0, Math.cos(-angle), 0],
			[0,                 0, 0,                1],
		]);
	}

	static createRotationZ(angle){
		return new Mat4([
			[Math.cos(-angle),  -Math.sin(-angle), 0, 0],
			[Math.sin(-angle), Math.cos(-angle), 0, 0],
			[0,                 0,                1, 0],
			[0,                 0,                0, 1],
		]);
	}

	static createTranslation(v){
		v = new Vector3(...arguments);
		return new Mat4([
			[1, 0, 0, 0],
			[0, 1, 0, 0],
			[0, 0, 1, 0],
			[v.x, v.y, v.z, 1],
		]);
	}

	static multiplyMatrices(a1, a2){
		const v1 = a1.values;
		const v2 = a2.values;

		return new Mat4([
			[
				v1[0][0]*v2[0][0] + v1[0][1]*v2[1][0] + v1[0][2]*v2[2][0] + v1[0][3]*v2[3][0],
				v1[0][0]*v2[0][1] + v1[0][1]*v2[1][1] + v1[0][2]*v2[2][1] + v1[0][3]*v2[3][1],
				v1[0][0]*v2[0][2] + v1[0][1]*v2[1][2] + v1[0][2]*v2[2][2] + v1[0][3]*v2[3][2],
				v1[0][0]*v2[0][3] + v1[0][1]*v2[1][3] + v1[0][2]*v2[2][3] + v1[0][3]*v2[3][3],
			],
			[
				v1[1][0]*v2[0][0] + v1[1][1]*v2[1][0] + v1[1][2]*v2[2][0] + v1[1][3]*v2[3][0],
				v1[1][0]*v2[0][1] + v1[1][1]*v2[1][1] + v1[1][2]*v2[2][1] + v1[1][3]*v2[3][1],
				v1[1][0]*v2[0][2] + v1[1][1]*v2[1][2] + v1[1][2]*v2[2][2] + v1[1][3]*v2[3][2],
				v1[1][0]*v2[0][3] + v1[1][1]*v2[1][3] + v1[1][2]*v2[2][3] + v1[1][3]*v2[3][3],
			],
			[
				v1[2][0]*v2[0][0] + v1[2][1]*v2[1][0] + v1[2][2]*v2[2][0] + v1[2][3]*v2[3][0],
				v1[2][0]*v2[0][1] + v1[2][1]*v2[1][1] + v1[2][2]*v2[2][1] + v1[2][3]*v2[3][1],
				v1[2][0]*v2[0][2] + v1[2][1]*v2[1][2] + v1[2][2]*v2[2][2] + v1[2][3]*v2[3][2],
				v1[2][0]*v2[0][3] + v1[2][1]*v2[1][3] + v1[2][2]*v2[2][3] + v1[2][3]*v2[3][3],
			],
			[
				v1[3][0]*v2[0][0] + v1[3][1]*v2[1][0] + v1[3][2]*v2[2][0] + v1[3][3]*v2[3][0],
				v1[3][0]*v2[0][1] + v1[3][1]*v2[1][1] + v1[3][2]*v2[2][1] + v1[3][3]*v2[3][1],
				v1[3][0]*v2[0][2] + v1[3][1]*v2[1][2] + v1[3][2]*v2[2][2] + v1[3][3]*v2[3][2],
				v1[3][0]*v2[0][3] + v1[3][1]*v2[1][3] + v1[3][2]*v2[2][3] + v1[3][3]*v2[3][3],
			],
		]);
	}

	multiplyMatrix(mat2){
		let newMat = Mat4.multiplyMatrices(this, mat2);
		this.values = newMat.values;
	}

	multiplyVector(x,y,z,w){
		if(x instanceof Array){
			let vec = x;
			x = vec[0];
			y = vec[1];
			z = vec[2];
			w = vec[3];
		}
		return [
			x * this.values[0][0] + y * this.values[0][1] + z * this.values[0][2] + w * this.values[0][3],
			x * this.values[1][0] + y * this.values[1][1] + z * this.values[1][2] + w * this.values[1][3],
			x * this.values[2][0] + y * this.values[2][1] + z * this.values[2][2] + w * this.values[2][3],
			x * this.values[3][0] + y * this.values[3][1] + z * this.values[3][2] + w * this.values[3][3],
		];
	}
}
