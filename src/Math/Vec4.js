export default class Vec4{
	constructor(x=0, y=0, z=0, w=0){
		this.onChangeCbs = new Set();
		this.set(x,y,z,w);
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

	set(x=0, y=0, z=0, w=0){
		if(x instanceof Vec4){
			let vector = x;
			x = vector.x;
			y = vector.y;
			z = vector.z;
		}else if(Array.isArray(x)){
			let vector = x;
			x = vector[0];
			y = vector[1];
			z = vector[2];
		}

		this._x = x;
		this._y = y;
		this._z = z;
		this._w = z;
		this.fireOnChange();
	}

	clone(){
		return new Vec4(this);
	}

	toArray(){
		return [this.x, this.y, this.z, this.w];
	}

	onChange(cb){
		this.onChangeCbs.add(cb);
	}

	removeOnChange(cb){
		this.onChangeCbs.delete(cb);
	}

	fireOnChange(){
		for(const cb of this.onChangeCbs){
			cb();
		}
	}
}
