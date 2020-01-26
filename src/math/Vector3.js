export default class Vector3{
	constructor(x=0, y=0, z=0){
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

		this.x = x;
		this.y = y;
		this.z = z;
	}

	clone(){
		return new Vector3(this);
	}

	get magnitude(){
		return Math.sqrt(this.x**2 + this.y**2 + this.z**2);
	}

	set magnitude(value){
		let diff = value / this.magnitude;
		this.x *= diff;
		this.y *= diff;
		this.z *= diff;
		if(isNaN(this.x)) this.x = 0;
		if(isNaN(this.y)) this.y = 0;
		if(isNaN(this.z)) this.z = 0;
	}

	normalize(){
		this.magnitude = 1;
	}
}
