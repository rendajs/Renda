import Vec3 from "../Math/Vec3.js";
import MeshAttributeBuffer from "./MeshAttributeBuffer.js";

export default class Mesh{
	constructor(){
		this._buffers = new Map();
		this._vertexState = null;
	}

	destructor(){
		for(const buffer of this._buffers.values()){
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

	static getAttributeNameForType(typeId){
		for(const [name, type] of Object.entries(Mesh.AttributeTypes)){
			if(type == typeId) return name;
		}
		return typeId;
	}

	setBuffer(type, data, opts){
		const buffer = new MeshAttributeBuffer(data, opts);
		this._buffers.set(type, buffer);
	}

	getBuffer(type){
		return this._buffers.get(type);
	}

	getBufferTypes(){ return this._buffers.keys() }
	getBuffers(){ return this._buffers.values() }
	getBufferEntries(){ return this._buffers.entries() }

	getVertexState(){
		return this._vertexState;
	}

	setVertexState(layout){
		this._vertexState = layout;
	}

	//todo: move this method to the renderer
	uploadToWebGl(gl){
		for(const [type, buffer] of this._buffers){
			let bufferType = gl.ARRAY_BUFFER;
			if(type == Mesh.AttributeTypes.INDEX){
				bufferType = gl.ELEMENT_ARRAY_BUFFER;
			}
			buffer.uploadToWebGl(gl, bufferType);
		}
	}
}
