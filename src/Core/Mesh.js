import Vec3 from "../Math/Vec3.js";
import MeshAttributeBuffer from "./MeshAttributeBuffer.js";

export default class Mesh{
	constructor(){
		this.buffers = new Map();
		this.vertexLayout = null;
	}

	destructor(){
		for(const buffer of this.buffers.values()){
			buffer.destructor();
		}
	}

	static get AttributeTypes(){
		return {
			INDEX: 1,
			POSITION: 2,
			NORMAL: 3,
			COLOR: 4,
		}
	}

	setBuffer(type, data, opts){
		const buffer = new MeshAttributeBuffer(data, opts);
		this.buffers.set(type, buffer);
	}

	getBuffer(type){
		return this.buffers.get(type);
	}

	setVertexLayout(layout){
		this.vertexLayout = layout;
	}

	//todo: move this method to the renderer
	uploadToWebGl(gl){
		for(const [type, buffer] of this.buffers){
			let bufferType = gl.ARRAY_BUFFER;
			if(type == Mesh.AttributeTypes.INDEX){
				bufferType = gl.ELEMENT_ARRAY_BUFFER;
			}
			buffer.uploadToWebGl(gl, bufferType);
		}
	}
}
