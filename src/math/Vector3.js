export default class Vector3{
	constructor(x=0, y=0, z=0){
		this.onChangeCbs = [];
		this.set(x,y,z)
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
			let vec = x;
			x = vec.x;
			y = vec.y;
			z = vec.z;
		}else if(x instanceof Object){
			let vec = x;
			x = vec[0];
			y = vec[1];
			z = vec[2];
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
