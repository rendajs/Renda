export default class BinaryDecomposer{
	constructor(buffer, {
		littleEndian = true,
	} = {}){
		this.dataView = new DataView(buffer);
		this.littleEndian = littleEndian;

		this.cursor = 0;
	}

	getInt8(){
		const val = this.dataView.getInt8(this.cursor, this.littleEndian);
		this.cursor++;
		return val;
	}

	getUint8(){
		const val = this.dataView.getUint8(this.cursor, this.littleEndian);
		this.cursor++;
		return val;
	}

	getInt16(){
		const val = this.dataView.getInt16(this.cursor, this.littleEndian);
		this.cursor += 2;
		return val;
	}

	getUint16(){
		const val = this.dataView.getUint16(this.cursor, this.littleEndian);
		this.cursor += 2;
		return val;
	}

	getInt32(){
		const val = this.dataView.getInt32(this.cursor, this.littleEndian);
		this.cursor += 4;
		return val;
	}

	getUint32(){
		const val = this.dataView.getUint32(this.cursor, this.littleEndian);
		this.cursor += 4;
		return val;
	}

	getUuid(){
		const buffer = this.dataView.buffer.slice(this.cursor, this.cursor+16);
		this.cursor += 16;
		return BinaryDecomposer.binaryToUuid(buffer);
	}

	static binaryToUuid(buffer, offset = 0){
		if(!ArrayBuffer.isView(buffer)){
			buffer = new Uint8Array(buffer);
		}
		let str = "";
		for(let i=0; i<16; i++){
			str += buffer[offset+i].toString(16).padStart(2, "0");
			if(i == 3 || i == 5 || i == 7 || i == 9) str += "-";
		}
		return str;
	}
}
