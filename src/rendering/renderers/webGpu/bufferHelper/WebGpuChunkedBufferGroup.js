import { Vec2 } from "../../../../math/Vec2.js";

/**
 * @typedef {"f32" | "i32" | "u32"} AppendFormat
 */

export class WebGpuChunkedBufferGroup {
	/**
	 * @typedef ScalarDataEntry
	 * @property {"scalar"} type
	 * @property {AppendFormat} format
	 * @property {number} value
	 * @property {number} byteLength
	 */
	/**
	 * @typedef EmptyDataEntry
	 * @property {"empty"} type
	 * @property {number} byteLength
	 */
	/**
	 * @typedef BufferDataEntry
	 * @property {"buffer"} type
	 * @property {Uint8Array} buffer
	 * @property {number} byteLength
	 */
	/**
	 * @typedef {ScalarDataEntry | BufferDataEntry | EmptyDataEntry} DataEntry
	 */

	/** @type {DataEntry[]} */
	#dataEntries = [];
	#byteLength = 0;
	/**
	 * There are some constrains to the size of binding:
	 * https://gpuweb.github.io/gpuweb/wgsl/#alignment-and-size
	 * This essentially means that we need to add some padding at the end of our buffer in order to satisfy this constraint.
	 * The size of the padding is determined by the largest required alignment.
	 */
	#largestRequiredAlignment = 1;
	get byteLength() {
		return this.#byteLength;
	}

	/**
	 * When binding this group, WebGPU expects the size of the binding to be aligned to a certain size.
	 * This property should be used when creating a new bind group entry.
	 * The extra bytes might contain data from a different group, or they may be empty.
	 * Additionally, when this group is placed at the end of a chunk, we need to make sure there are
	 * enough empty bytes at the end of that chunk to facilitate the padding.
	 */
	get byteLengthWithPadding() {
		return Math.ceil(this.#byteLength / this.#largestRequiredAlignment) * this.#largestRequiredAlignment;
	}

	/**
	 * Appends a numeric value to the data.
	 * @param {number} scalar
	 * @param {AppendFormat} type
	 */
	appendScalar(scalar, type = "f32") {
		this.#dataEntries.push({
			byteLength: 4,
			type: "scalar",
			format: type,
			value: scalar,
		});
		this.#byteLength += 4;
		this.#largestRequiredAlignment = Math.max(4, this.#largestRequiredAlignment);
	}

	/**
	 * Appends a matrix to the data.
	 * @param {import("../../../../math/Mat4.js").Mat4} matrix
	 * @param {AppendFormat} type
	 */
	appendMatrix(matrix, type = "f32") {
		this.appendBuffer(matrix.getFlatArrayBuffer(type));
		this.#largestRequiredAlignment = Math.max(16, this.#largestRequiredAlignment);
	}

	/**
	 * Appends a vector or quaternion to the data.
	 * @param {import("../../../../math/Vec2.js").Vec2 | import("../../../../math/Vec3.js").Vec3 | import("../../../../math/Vec4.js").Vec4 | import("../../../../math/Quat.js").Quat} data
	 * @param {AppendFormat} type
	 */
	appendMathType(data, type = "f32") {
		for (const value of data.toArray()) {
			this.appendScalar(value, type);
		}
		if (data instanceof Vec2) {
			this.#largestRequiredAlignment = Math.max(8, this.#largestRequiredAlignment);
		} else {
			this.#largestRequiredAlignment = Math.max(16, this.#largestRequiredAlignment);
		}
	}

	/**
	 * Appends an array of numbers to the data.
	 * @param {number[]} array
	 * @param {AppendFormat} type
	 */
	appendNumericArray(array, type = "f32") {
		for (const value of array) {
			this.appendScalar(value, type);
		}
	}

	/**
	 * Appends arbitrary binary data.
	 * @param {Uint8Array} buffer
	 */
	appendBuffer(buffer) {
		this.#dataEntries.push({
			type: "buffer",
			buffer,
			byteLength: buffer.byteLength,
		});
		this.#byteLength += buffer.byteLength;
	}

	/**
	 * Appends empty bytes to the data, useful if some of your data needs to be aligned to a specific amount of bytes.
	 * @param {number} byteLength
	 */
	appendEmptyBytes(byteLength) {
		this.#dataEntries.push({
			type: "empty",
			byteLength,
		});
		this.#byteLength += byteLength;
	}

	/**
	 * Removes all the data and makes this an empty group of zero bytes.
	 */
	clearData() {
		this.#dataEntries = [];
		this.#byteLength = 0;
		this.#largestRequiredAlignment = 1;
	}

	/**
	 * Creates an arraybuffer that contains all of the current data.
	 */
	getBuffer() {
		const buffer = new ArrayBuffer(this.byteLength);
		const dataView = new DataView(buffer);
		const intView = new Uint8Array(buffer);

		let cursorByteIndex = 0;
		for (const entry of this.#dataEntries) {
			if (entry.type == "scalar") {
				if (entry.format == "f32") {
					dataView.setFloat32(cursorByteIndex, entry.value, true);
				} else if (entry.format == "i32") {
					dataView.setInt32(cursorByteIndex, entry.value, true);
				} else if (entry.format == "u32") {
					dataView.setUint32(cursorByteIndex, entry.value, true);
				}
			} else if (entry.type == "buffer") {
				intView.set(entry.buffer, cursorByteIndex);
			}
			cursorByteIndex += entry.byteLength;
		}
		return buffer;
	}
}
