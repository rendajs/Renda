export default class Vec2{
	constructor(x=0, y=0){
		this.onChangeCbs = new Set();
		this.set(x,y);
	}

	get x(){
		return this._x;
	}
	get y(){
		return this._y;
	}

	set x(value){
		this._x = value;
		this.fireOnChange();
	}
	set y(value){
		this._y = value;
		this.fireOnChange();
	}

	set(x=0, y=0){
		if(x instanceof Vec2){
			let vector = x;
			x = vector.x;
			y = vector.y;
		}else if(Array.isArray(x)){
			let vector = x;
			x = vector[0];
			y = vector[1];
		}

		this._x = x;
		this._y = y;
		this.fireOnChange();
	}

	fireOnChange(){
		for(const cb of this.onChangeCbs){
			cb();
		}
	}
}
