import Vector3 from "./Vector3.js";

export default class Quaternion{
	constructor(x=0, y=0, z=0, w=1){
		this.set(x,y,z,w)
	}

	set(x=0, y=0, z=0, w=1){
		if(x instanceof Quaternion){
			let q = x;
			w = q.w;
			x = q.x;
			y = q.y;
			z = q.z;
		}

		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;
	}

	static fromAxisAngle(axis, angle){
		if(arguments.length == 4){
			axis = new Vector3(arguments[0], arguments[1], arguments[2]);
			angle = arguments[3];
		}
		let vec = axis.clone();
		vec.normalize();
		if(isNaN(vec.x) || isNaN(vec.y) || isNaN(vec.z)) return new Quaternion();
		let qw = Math.cos(angle/2);
		let s = Math.sin(angle/2);
		let qx = vec.x * s;
		let qy = vec.y * s;
		let qz = vec.z * s;
		let q = new Quaternion(qw,qx,qy,qz);
		return q;
	}

	static multiplyQuaternions(q1, q2){
		return new Quaternion(
			q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z,
			q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
			q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
			q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w,
		);
	}

	multiply(q){
		let newQ = Quaternion.multiplyQuaternions(this, q);
		this.set(newQ);
	}

	rotateAxisAngle(axis, angle){
		let q = Quaternion.fromAxisAngle(...arguments);
		this.multiply(q);
	}
}
