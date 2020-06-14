import Vector3 from "../Math/Vector3.js";
import MeshAttributeBuffer from "./MeshAttributeBuffer.js";

export default class Mesh{
	constructor(){
		this.buffers = new Map();
	}

	destructor(){
		for(const buffer of this.buffers.values()){
			buffer.destructor();
		}
	}

	static get AttributeTypes(){
		return {
			index: 1,
			position: 2,
			normal: 3,
			color: 4,
		}
	}

	setBuffer(type, data, opts){
		const buffer = new MeshAttributeBuffer(data, opts);
		this.buffers.set(type, buffer);
	}

	getBuffer(type){
		return this.buffers.get(type);
	}

	uploadToWebGl(gl){
		for(const [type, buffer] of this.buffers){
			let bufferType = gl.ARRAY_BUFFER;
			if(type == Mesh.AttributeTypes.index){
				bufferType = gl.ELEMENT_ARRAY_BUFFER;
			}
			buffer.uploadToWebGl(gl, bufferType);
		}
	}
}
