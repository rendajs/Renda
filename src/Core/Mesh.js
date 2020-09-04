import Vec3 from "../Math/Vec3.js";
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

	uploadToWebGl(gl){
		for(const [type, buffer] of this.buffers){
			let bufferType = gl.ARRAY_BUFFER;
			if(type == Mesh.AttributeTypes.INDEX){
				bufferType = gl.ELEMENT_ARRAY_BUFFER;
			}
			buffer.uploadToWebGl(gl, bufferType);
		}
	}

	toBlob(){
		const blobData = [];
		const magicHeader = new ArrayBuffer(4);
		new DataView(magicHeader).setUint32(0, 0x68734D6A, true); //jMsh
		blobData.push(magicHeader);
		for(const [type, buffer] of this.buffers){
			const chunkHeader = new ArrayBuffer(8);
			const dataView = new DataView(chunkHeader);
			dataView.setUint16(0, type, true);
			dataView.setUint8(2, buffer.componentCount, true);
			dataView.setUint8(3, buffer.componentType, true);
			dataView.setUint32(4, buffer.arrayBuffer.byteLength, true);
			blobData.push(chunkHeader);
			blobData.push(buffer.arrayBuffer); //todo: make sure this is little endian
		}
		return new Blob(blobData);
	}

	static async fromBlob(blob){
		const dataView = new DataView(await blob.arrayBuffer());
		if(dataView.getUint32(0, true) != 0x68734D6A) return null;
		const mesh = new Mesh();
		let i=4;
		while(i < dataView.byteLength){
			const type = dataView.getUint16(i, true);
			i += 2;
			const componentCount = dataView.getUint8(i, true);
			i++;
			const componentType = dataView.getUint8(i, true);
			i++;
			const length = dataView.getUint32(i, true);
			i += 4;
			const data = dataView.buffer.slice(i, i + length);
			mesh.setBuffer(type, data, {componentCount, componentType});
			i += length;
		}
		return mesh;
	}
}
