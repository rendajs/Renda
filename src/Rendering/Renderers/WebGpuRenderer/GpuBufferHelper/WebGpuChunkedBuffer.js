import {WebGpuChunkedBufferChunk} from "./WebGpuChunkedBufferChunk.js";

/**
 * @typedef {"f32" | "i32" | "u32"} AppendFormat
 */

/**
 * Helper class for creating multiple WebGPU buffers (chunks) that share a similar bindgroup layout.
 * This class creates and destroys buffers based on your usage. If your data is to long
 * to fit in a single buffer, a new buffer is created.
 */
export class WebGpuChunkedBuffer {
	/**
	 * @param {Object} opts
	 * @param {GPUDevice} [opts.device] The WebGPU device to create buffers for.
	 * @param {string} [opts.label] The label to use for debugging.
	 * @param {GPUBindGroupLayout} [opts.bindGroupLayout] The bind group layout to use.
	 * This can be omitted, but you won't be able to create bindGroups. You can
	 * still manually create bindGroups using `createBindGroupEntry`.
	 * @param {number} [opts.bindGroupLength] The length of the bind groups in bytes. Only a single portion of the buffer
	 * will be bound per draw call. So you should set this to the size of all the "uniforms" needed in a single draw call.
	 * @param {number} [opts.chunkSize] The size of every buffer. That is, how many bytes until a new buffer should be created.
	 * @param {GPUBufferUsage | number} [opts.usage] The usage of the bindgroups.
	 */
	constructor({
		device = null,
		label = "ChunkedBuffer",
		bindGroupLayout = null,
		bindGroupLength = 512,
		chunkSize = 512,
		usage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
	} = {}) {
		if (bindGroupLength > chunkSize) {
			throw new Error("bindGroupLength must be smaller than chunkSize");
		}
		this.device = device;
		this.label = label;
		this.bindGroupLayout = bindGroupLayout;
		this.bindGroupLength = bindGroupLength;
		this.chunkSize = chunkSize;
		this.usage = /** @type {number} */ (usage);

		/** @type {WebGpuChunkedBufferChunk[]} */
		this.gpuBufferChunks = [];

		/** The index of the currently active chunk (the active buffer). */
		this.currentBufferChunkIndex = 0;
		/** The start byte index of the currently editing entry location. */
		this.currentEntryLocationBufferOffset = 0;
		/** The current cursor location used for appending new data to the buffer. */
		this.currentCursorByteIndex = 0;

		this.createChunk();
	}

	createChunk() {
		const index = this.gpuBufferChunks.length;
		const chunk = new WebGpuChunkedBufferChunk(this, index);
		this.gpuBufferChunks.push(chunk);
		return chunk;
	}

	getCurrentChunk() {
		return this.gpuBufferChunks[this.currentBufferChunkIndex];
	}

	/**
	 * Gets the current bind group and offset to be passed along to {@link GPUProgrammablePassEncoder.setBindGroup}.
	 */
	getCurrentEntryLocation() {
		const chunk = this.getCurrentChunk();
		return {
			bindGroup: chunk.getBindGroup(this.bindGroupLayout),
			dynamicOffset: this.currentEntryLocationBufferOffset,
		};
	}

	/**
	 * Updates the cursor to the next entry location.
	 * Creates a new buffer if the current buffer is full.
	 */
	nextEntryLocation() {
		this.currentEntryLocationBufferOffset += this.bindGroupLength;
		if (this.currentEntryLocationBufferOffset >= this.chunkSize) {
			this.currentEntryLocationBufferOffset = 0;
			this.currentBufferChunkIndex++;
			if (this.currentBufferChunkIndex >= this.gpuBufferChunks.length) {
				this.createChunk();
			}
		}
		this.currentCursorByteIndex = this.currentEntryLocationBufferOffset;
	}

	/**
	 * Resets the entry location back to the start of the first buffer.
	 */
	resetEntryLocation() {
		this.currentBufferChunkIndex = 0;
		this.currentEntryLocationBufferOffset = 0;
		this.currentCursorByteIndex = 0;
	}

	writeAllChunksToGpu() {
		for (const chunk of this.gpuBufferChunks) {
			chunk.writeToGpu();
		}
	}

	/**
	 * @param {number} scalar
	 * @param {AppendFormat} type
	 */
	appendScalar(scalar, type = "f32") {
		const chunk = this.getCurrentChunk();
		switch (type) {
			case "f32":
			default:
				chunk.dataView.setFloat32(this.currentCursorByteIndex, scalar, true);
				break;
			case "i32":
				chunk.dataView.setInt32(this.currentCursorByteIndex, scalar, true);
				break;
			case "u32":
				chunk.dataView.setUint32(this.currentCursorByteIndex, scalar, true);
				break;
		}
		this.currentCursorByteIndex += 4;
	}

	/**
	 * @param {import("../../../../math/Mat4.js").Mat4} matrix
	 * @param {AppendFormat} type
	 */
	appendMatrix(matrix, type = "f32") {
		const buffer = matrix.getFlatArrayBuffer(type);
		const chunk = this.getCurrentChunk();
		const view = new Uint8Array(chunk.arrayBuffer);
		view.set(buffer, this.currentCursorByteIndex);
		this.currentCursorByteIndex += buffer.byteLength;
	}

	/**
	 * @param {number | number[] | import("../../../../math/Vec2.js").Vec2 | import("../../../../math/Vec3.js").Vec3 | import("../../../../math/Vec4.js").Vec4 | import("../../../../math/Mat4.js").Mat4} data
	 * @param {AppendFormat} type
	 */
	appendData(data, type = "f32") {
		if (typeof data == "number") {
			this.appendScalar(data, type);
		} else {
			if (!Array.isArray(data)) data = data.toArray();
			for (const val of data) {
				this.appendScalar(val, type);
			}
		}
	}

	skipBytes(byteLength) {
		this.currentCursorByteIndex += byteLength;
	}
}
