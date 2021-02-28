import Vec3 from "../Math/Vec3.js";
import MeshAttributeBuffer from "./MeshAttributeBuffer.js";

export default class Mesh{
	constructor(){
		this._buffers = [];
		this._vertexState = null;
		this.indexBuffer = null;

		this.vertexCount = 0;
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

	setIndexData(data){
		if(data instanceof ArrayBuffer){
			//data already has the correct format
		}else if(ArrayBuffer.isView(data)){
			data = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
			//todo
		}else if(Array.isArray(data)){
			if(data.length <= 0){
				data = new ArrayBuffer();
			}else if(typeof data[0] == "number"){
				const arr = new Uint16Array(data);
				data = arr.buffer;
			}
		}

		if(!(data instanceof ArrayBuffer)){
			throw new TypeError("invalid data type");
		}
		this.indexBuffer = data;
	}

	setVertexCount(vertexCount){
		this.vertexCount = vertexCount;
		for(const buffer of this._buffers){
			buffer.setVertexCount(vertexCount);
		}
	}

	setVertexData(attributeType, data, opts){
		const buffer = this.getBufferForAttributeType(attributeType);
		if(buffer){
			buffer.setVertexData(attributeType, data);
		}
	}

	getBufferForAttributeType(attributeType){
		for(const buffer of this._buffers){
			if(buffer.hasAttributeType(attributeType)){
				return buffer;
			}
		}
		return null;
	}

	*getBuffers(){
		for(const buffer of this._buffers){
			yield buffer;
		}
	}

	get vertexState(){
		return this._vertexState;
	}

	setVertexState(layout){
		this._vertexState = layout;

		const oldBuffers = this._buffers; //todo, transfer to new layout

		this._buffers = [];
		for(const [bufferIndex, bufferDescriptor] of layout.descriptor.vertexBuffers.entries()){
			const attributes = [];
			for(const [attributeIndex, attribute] of bufferDescriptor.attributes.entries()){
				const attributeType = layout.attributeTypeMap[bufferIndex][attributeIndex];
				attributes.push({
					offset: attribute.offset,
					format: attribute.format,
					components: 3,
					attributeType,
				});
			}
			const buffer = new MeshAttributeBuffer({
				arrayStride: bufferDescriptor.arrayStride,
				attributes,
			});
			if(this.vertexCount) buffer.setVertexCount(this.vertexCount);
			this._buffers.push(buffer);
		}
	}
}
