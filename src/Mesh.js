import Vector3 from "./math/Vector3.js";

export default class Mesh{
	constructor(){
		this.positions = [];
		this.indices = [];

		this.indexBuffer = null;
		this.positionBuffer = null;
	}

	updateBuffersGl(gl){
		this.indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.indexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);

		this.positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		let positions = new Float32Array(this.positions.length * 3);
		let i=0;
		for(const pos of this.positions){
			positions[i++] = pos.x;
			positions[i++] = pos.y;
			positions[i++] = pos.z;
		}
		gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
	}
}
