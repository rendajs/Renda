export class WebGpuChunkedBufferChunk {
	#chunkedBuffer;
	#size;
	get size() {
		return this.#size;
	}
	#chunkIndex;
	#arrayBuffer;
	#intView;

	/**
	 * @param {import("./WebGpuChunkedBuffer.js").WebGpuChunkedBuffer} chunkedBuffer
	 * @param {number} size
	 * @param {number} chunkIndex
	 */
	constructor(chunkedBuffer, size, chunkIndex) {
		this.#chunkedBuffer = chunkedBuffer;
		this.#size = size;
		this.#chunkIndex = chunkIndex;
		this.#arrayBuffer = new ArrayBuffer(size);
		this.#intView = new Uint8Array(this.#arrayBuffer);
		this.gpuBuffer = this.#chunkedBuffer.device.createBuffer({
			label: this.label,
			size,
			usage: this.#chunkedBuffer.usage,
		});
	}

	get label() {
		return this.#chunkedBuffer.label + "-chunk" + this.#chunkIndex;
	}

	/**
	 * @param {import("./WebGpuChunkedBufferGroup.js").WebGpuChunkedBufferGroup} group
	 * @param {number} offset
	 */
	addGroup(group, offset) {
		this.#intView.set(new Uint8Array(group.getBuffer()), offset);
	}

	writeToGpu() {
		this.#chunkedBuffer.device.queue.writeBuffer(this.gpuBuffer, 0, this.#arrayBuffer);
	}
}
