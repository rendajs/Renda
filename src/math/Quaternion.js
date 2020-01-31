import Vector3 from "./Vector3.js";

export default class Quaternion{
	constructor(x=0, y=0, z=0, w=1){
		this.onChangeCbs = [];
		this.set(x,y,z,w)
	}

	set(x=0, y=0, z=0, w=1){
		if(x instanceof Quaternion){
			let q = x;
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

	clone(){
		return new Quaternion(this);
	}

	get x(){
		return this._x;
	}
	get y(){
		return this._y;
	}
	get z(){
		return this._z;
	}
	get w(){
		return this._w;
	}
	set x(value){
		this._x = value;
		this.fireOnChange();
	}
	set y(value){
		this._y = value;
		this.fireOnChange();
	}
	set z(value){
		this._z = value;
		this.fireOnChange();
	}
	set w(value){
		this._w = value;
		this.fireOnChange();
	}

	static fromAxisAngle(axis, angle){
		if(arguments.length == 4){
			axis = new Vector3(arguments[0], arguments[1], arguments[2]);
			angle = arguments[3];
		}
		let vec = axis.clone();
		vec.normalize();
		if(isNaN(vec.x) || isNaN(vec.y) || isNaN(vec.z)) return new Quaternion();
		let s = Math.sin(angle/2);
		let qx = vec.x * s;
		let qy = vec.y * s;
		let qz = vec.z * s;
		let qw = Math.cos(angle/2);
		let q = new Quaternion(qx,qy,qz,qw);
		return q;
	}

	static multiplyQuaternions(q1, q2){
		return new Quaternion(
			q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
			q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
			q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w,
			q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z,
		);
	}

	preMultiply(q){
		this.set(Quaternion.multiplyQuaternions(q, this));
		return this;
	}

	multiply(q){
		this.set(Quaternion.multiplyQuaternions(this, q));
		return this;
	}

	rotateAxisAngle(axis, angle){
		let q = Quaternion.fromAxisAngle(...arguments);
		this.multiply(q);
		return this;
	}

	invert(){
		this.set(-this.x, -this.y, -this.z, this.w);
		return this;
	}

	rotateVector(x,y,z){
		//TODO: optimise: gamedev.stackexchange.com/a/50545/87477
		let vec = new Vector3(...arguments);
		let pin = new Quaternion(vec.x, vec.y, vec.z, 1);
		let qconj = new Quaternion(this);
		qconj.invert();
		let pout = Quaternion.multiplyQuaternions(qconj, Quaternion.multiplyQuaternions(pin, this));
		let newVec = new Vector3(
			pout.x,
			pout.y,
			pout.z,
		);
		newVec.magnitude = vec.magnitude;
		return newVec;
	}

	onChange(cb){
		this.onChangeCbs.push(cb);
	}

	removeOnChange(cb){
		let index = this.onChangeCbs.indexOf(cb);
		if(index >= 0){
			this.onChangeCbs.splice(index, 1);
		}
	}

	fireOnChange(){
		for(const cb of this.onChangeCbs){
			cb();
		}
	}
}
