import Vec3 from "../Math/Vec3.js";
import MeshAttributeBuffer from "./MeshAttributeBuffer.js";

export default class Mesh{
	constructor(){
		this._buffers = [];
		this._vertexState = null;
		this.indexBuffer = null;
		this.indexFormat = Mesh.IndexFormat.UINT_16;

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

	static get IndexFormat(){
		return {
			UINT_16: 1,
			UINT_32: 2,
		}
	};

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
			if(data instanceof Uint32Array){
				this.indexFormat = Mesh.IndexFormat.UINT_32;
			}
		}else if(Array.isArray(data)){
			let bufferLength = 0;
			if(this.indexFormat == Mesh.IndexFormat.UINT_16){
				bufferLength = data.length * 2;
			}else if(this.indexFormat == Mesh.IndexFormat.UINT_32){
				bufferLength = data.length * 4;
			}
			const newBuffer = new ArrayBuffer(bufferLength);
			const dataView = new DataView(newBuffer);
			if(this.indexFormat == Mesh.IndexFormat.UINT_16){
				for(let i=0; i<data.length; i++){
					dataView.setUint16(i*2, data[i], true);
				}
			}else if(this.indexFormat == Mesh.IndexFormat.UINT_32){
				for(let i=0; i<data.length; i++){
					dataView.setUint32(i*4, data[i], true);
				}
			}
			data = newBuffer;
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
