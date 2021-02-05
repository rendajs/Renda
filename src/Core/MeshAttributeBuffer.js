import {Vec3} from "../index.js";

export default class MeshAttributeBuffer{
	constructor(data, {
		componentCount = 1, //amount of components per attribute e.g. 3 for vec3
		attributeType = null,
	} = {}){
		if(data instanceof ArrayBuffer){
			//data does not need to be parsed
		}else if(ArrayBuffer.isView(data)){
			data = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
		}else{
			if(!Array.isArray(data)){
				throw new TypeError("invalid data type");
			}
			if(data.length <= 0){
				data = new Uint8Array();
			}else if(typeof data[0] == "number"){
				componentCount = 1;
				data = new Uint16Array(data);
			}else if(data[0] instanceof Vec3){
				componentCount = 3;
				const newData = new Float32Array(data.length * 3);
				let i=0;
				for(const pos of data){
					newData[i++] = pos.x;
					newData[i++] = pos.y;
					newData[i++] = pos.z;
				}
				data = newData;
			}
		}

		this.componentCount = componentCount;
		this.attributeType = attributeType;
		this.arrayBuffer = data;
		this.glBuffer = null;
	}

	destructor(){
		if(this.glBuffer){
			//todo
			//gl.deleteBuffer(this.glBuffer);
			this.glBuffer = null;
		}
		this.arrayBuffer = null;
	}
}
