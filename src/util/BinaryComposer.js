import {uuidToBinary} from "./binarySerialization.js";

export class BinaryComposer {
	constructor({
		littleEndian = true,
	} = {}) {
		/** @type {ArrayBuffer[]} */
		this.bufferList = [];
		this.littleEndian = littleEndian;
	}

	getFullBuffer() {
		if (this.bufferList.length == 0) {
			return new ArrayBuffer(0);
		} else if (this.bufferList.length == 1) {
			return this.bufferList[0];
		} else {
			let totalByteLength = 0;
			for (const chunk of this.bufferList) {
				totalByteLength += chunk.byteLength;
			}
			const intView = new Uint8Array(totalByteLength);
			let index = 0;
			for (const chunk of this.bufferList) {
				intView.set(new Uint8Array(chunk), index);
				index += chunk.byteLength;
			}
			const buff = intView.buffer;
			this.bufferList = [buff];
			return buff;
		}
	}

	/**
	 * @param {ArrayBuffer} buffer
	 */
	appendBuffer(buffer) {
		this.bufferList.push(buffer);
	}

	/**
	 * @param {number} value
	 */
	appendInt8(value) {
		const buffer = new ArrayBuffer(1);
		new DataView(buffer).setInt8(0, value);
		this.appendBuffer(buffer);
	}

	/**
	 * @param {number} value
	 */
	appendUint8(value) {
		const buffer = new ArrayBuffer(1);
		new DataView(buffer).setUint8(0, value);
		this.appendBuffer(buffer);
	}

	/**
	 * @param {number} value
	 */
	appendInt16(value) {
		const buffer = new ArrayBuffer(2);
		new DataView(buffer).setInt16(0, value, this.littleEndian);
		this.appendBuffer(buffer);
	}

	/**
	 * @param {number} value
	 */
	appendUint16(value) {
		const buffer = new ArrayBuffer(2);
		new DataView(buffer).setUint16(0, value, this.littleEndian);
		this.appendBuffer(buffer);
	}

	/**
	 * @param {number} value
	 */
	appendInt32(value) {
		const buffer = new ArrayBuffer(4);
		new DataView(buffer).setInt32(0, value, this.littleEndian);
		this.appendBuffer(buffer);
	}

	/**
	 * @param {number} value
	 */
	appendUint32(value) {
		const buffer = new ArrayBuffer(4);
		new DataView(buffer).setUint32(0, value, this.littleEndian);
		this.appendBuffer(buffer);
	}

	/**
	 * @param {import("./mod.js").UuidString} uuid
	 */
	appendUuid(uuid) {
		const buffer = uuidToBinary(uuid);
		this.appendBuffer(buffer);
	}
}
