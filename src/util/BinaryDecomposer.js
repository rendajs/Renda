import { binaryToUuid } from "./binarySerialization.js";

export class BinaryDecomposer {
	/**
	 * @param {ArrayBuffer} buffer
	 */
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

	getBigInt64() {
		const val = this.dataView.getBigInt64(this.cursor, this.littleEndian);
		this.cursor += 8;
		return val;
	}

	getBigUint64() {
		const val = this.dataView.getBigUint64(this.cursor, this.littleEndian);
		this.cursor += 8;
		return val;
	}

	/**
	 * @param {number} byteLength
	 */
	getBuffer(byteLength) {
		const buffer = this.dataView.buffer.slice(this.cursor, this.cursor + byteLength);
		this.cursor += byteLength;
		return buffer;
	}

	getUuid() {
		return binaryToUuid(this.getBuffer(16));
	}
}
