export default class BinaryDecomposer {
	constructor(buffer, {
		littleEndian = true,
	} = {}) {
		this.dataView = new DataView(buffer);
		this.littleEndian = littleEndian;

		this.cursor = 0;
	}

	getInt8() {
		const val = this.dataView.getInt8(this.cursor);
		this.cursor++;
		return val;
	}

	getUint8() {
		const val = this.dataView.getUint8(this.cursor);
		this.cursor++;
		return val;
	}

	getInt16() {
		const val = this.dataView.getInt16(this.cursor, this.littleEndian);
		this.cursor += 2;
		return val;
	}

	getUint16() {
		const val = this.dataView.getUint16(this.cursor, this.littleEndian);
		this.cursor += 2;
		return val;
	}

	getInt32() {
		const val = this.dataView.getInt32(this.cursor, this.littleEndian);
		this.cursor += 4;
		return val;
	}

	getUint32() {
		const val = this.dataView.getUint32(this.cursor, this.littleEndian);
		this.cursor += 4;
		return val;
	}

	getBuffer(byteLength) {
		const buffer = this.dataView.buffer.slice(this.cursor, this.cursor + byteLength);
		this.cursor += byteLength;
		return buffer;
	}

	getUuid() {
		return BinaryDecomposer.binaryToUuid(this.getBuffer(16));
	}

	static binaryToUuid(buffer, offset = 0) {
		if (!ArrayBuffer.isView(buffer)) {
			buffer = new Uint8Array(buffer);
		}
		let allZeros = true;
		let str = "";
		for (let i = 0; i < 16; i++) {
			const intValue = buffer[offset + i];
			if (intValue != 0) allZeros = false;
			str += intValue.toString(16).padStart(2, "0");
			if (i == 3 || i == 5 || i == 7 || i == 9) str += "-";
		}
		if (allZeros) return null;
		return str;
	}
}
