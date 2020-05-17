export default class Vector3{
	constructor(x=0, y=0, z=0){
		this.onChangeCbs = [];
		this.set(x,y,z)
	}

	static get left(){
		return new Vector3(-1,0,0);
	}

	static get down(){
		return new Vector3(0,-1,0);
	}

	static get back(){
		return new Vector3(0,0,-1);
	}

	static get right(){
		return new Vector3(1,0,0);
	}

	static get up(){
		return new Vector3(0,1,0);
	}

	static get forward(){
		return new Vector3(0,0,1);
	}

	static get one(){
		return new Vector3(1,1,1);
	}

	static get zero(){
		return new Vector3()
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

	set(x=0, y=0, z=0){
		if(x instanceof Vector3){
			let vector = x;
			x = vector.x;
			y = vector.y;
			z = vector.z;
		}else if(x instanceof Object){
			let vector = x;
			x = vector[0];
			y = vector[1];
			z = vector[2];
		}

		this._x = x;
		this._y = y;
		this._z = z;
		this.fireOnChange();
	}

	clone(){
		return new Vector3(this);
	}

	get magnitude(){
		return Math.sqrt(this.x**2 + this.y**2 + this.z**2);
	}

	set magnitude(value){
		let diff = value / this.magnitude;
		if(diff == 1) return;
		this._x *= diff;
		this._y *= diff;
		this._z *= diff;
		if(isNaN(this.x)) this._x = 0;
		if(isNaN(this.y)) this._y = 0;
		if(isNaN(this.z)) this._z = 0;
		this.fireOnChange();
	}

	normalize(){
		this.magnitude = 1;
		return this;
	}

	multiply(vectorOrScalar){
		if(vectorOrScalar instanceof Vector3 || arguments.length == 3){
			return this.multiplyVector(new Vector3(...arguments));
		}else{
			return this.multiplyScalar(vectorOrScalar);
		}
	}

	multiplyScalar(scalar){
		this._x *= scalar;
		this._y *= scalar;
		this._z *= scalar;
		this.fireOnChange();
		return this;
	}

	multiplyVector(vector){
		this._x *= vector.x;
		this._y *= vector.y;
		this._z *= vector.z;
		this.fireOnChange();
		return this;
	}

	add(vectorOrScalar){
		if(vectorOrScalar instanceof Vector3 || arguments.length == 3){
			return this.addVector(new Vector3(...arguments));
		}else{
			return this.addScalar(vectorOrScalar);
		}
	}

	addScalar(scalar){
		this._x += scalar;
		this._y += scalar;
		this._z += scalar;
		this.fireOnChange();
		return this;
	}

	addVector(vector){
		this._x += vector.x;
		this._y += vector.y;
		this._z += vector.z;
		this.fireOnChange();
		return this;
	}

	toArray(){
		return [this.x, this.y, this.z];
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
