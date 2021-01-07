import Vec3 from "../Math/Vec3.js";
import MeshAttributeBuffer from "./MeshAttributeBuffer.js";

export default class Mesh{
	constructor(){
		this._buffers = [];
		this._vertexState = null;
	}

	destructor(){
		for(const buffer of this._buffers.values()){
			buffer.destructor();
		}
	}

	static get AttributeTypes(){
		return {
			POSITION: 1,
			NORMAL: 2,
			COLOR: 3,
		}
	}

	static getAttributeNameForType(typeId){
		for(const [name, type] of Object.entries(Mesh.AttributeTypes)){
			if(type == typeId) return name;
		}
		return typeId;
	}

	setIndexBuffer(data){
		this._indexBuffer = new MeshAttributeBuffer(data, {
			componentCount: 1,
		});
	}

	setVertexData(type, data){

	}

	setBuffer(bufferId, data){
		const buffer = new MeshAttributeBuffer(data);
		this._buffers[bufferId] = buffer;
	}

	getBuffer(bufferId){
		return this._buffers[bufferId];
	}

	getVertexState(){
		return this._vertexState;
	}

	setVertexState(layout){
		this._vertexState = layout;
	}
}
