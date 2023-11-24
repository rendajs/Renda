export class WebGpuChunkedBufferChunk {
	/**
	 * @param {import("./WebGpuChunkedBuffer.js").WebGpuChunkedBuffer} chunkedBuffer
	 * @param {number} chunkIndex
	 */
	constructor(chunkedBuffer, chunkIndex) {
		this.chunkedBuffer = chunkedBuffer;
		this.chunkIndex = chunkIndex;
		this.arrayBuffer = new ArrayBuffer(this.chunkedBuffer.chunkSize);
		this.dataView = new DataView(this.arrayBuffer);
		this.gpuBuffer = this.chunkedBuffer.device.createBuffer({
			label: this.label,
			size: this.chunkedBuffer.chunkSize,
			usage: this.chunkedBuffer.usage,
		});
	}

	get label() {
		return this.chunkedBuffer.label + "-chunk" + this.chunkIndex;
	}

	/**
	 * @param {object} options
	 * @param {number} options.binding
	 */
	createBindGroupEntry({binding}) {
		return {
			binding,
			resource: {
				buffer: this.gpuBuffer,
				size: this.chunkedBuffer.bindGroupLength,
			},
		};
	}

	writeToGpu() {
		this.chunkedBuffer.device.queue.writeBuffer(this.gpuBuffer, 0, this.arrayBuffer);
	}
}
