import Vector3 from "./math/Vector3.js";

export default class Mesh{
	constructor(){
		this.vertices = [];
		this.indices = [];

		this.materials = [];
	}

	get material(){
		return this.materials[0];
	}

	set material(value){
		this.materials[0] = value;
	}
}
