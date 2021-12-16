export class CachedMeshBufferData {
	/**
	 *
	 * @param {import("../../../Core/MeshAttributeBuffer.js").MeshAttributeBuffer} meshBuffer
	 * @param {import("./CachedMeshData.js").CachedMeshData} meshData
	 */
	constructor(meshBuffer, meshData) {
		this.meshBuffer = meshBuffer;
		this.meshData = meshData;

		this.gpuBuffer = null;
		this.currentGpuBufferSize = 0;
		this.createGpuBuffer();

		// todo: remove listeners when gpurenderer is destroyed
		this.bufferDirty = false;
		meshBuffer.onBufferChanged(() => {
			this.bufferDirty = true;
		});
	}

	destructor() {
		// todo
	}

	createGpuBuffer() {
		if (this.gpuBuffer) {
			this.gpuBuffer.destroy();
		}
		const size = this.meshBuffer.buffer.byteLength;
		this.gpuBuffer = this.meshData.renderer.device.createBuffer({
			label: "meshBufferDataBuffer",
			size,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, // todo: only use copy_dst when buffer updates are actually expected
			mappedAtCreation: true,
		});
		new Uint8Array(this.gpuBuffer.getMappedRange()).set(new Uint8Array(this.meshBuffer.buffer));
		this.gpuBuffer.unmap();
		this.currentGpuBufferSize = size;
	}

	getBufferGpuCommands() {
		let newBufferData = null;
		if (this.bufferDirty) {
			if (this.currentGpuBufferSize != this.meshBuffer.buffer.byteLength) {
				this.createGpuBuffer();
			}
			newBufferData = this.meshBuffer.buffer;
			this.bufferDirty = false;
		}
		return {
			gpuBuffer: this.gpuBuffer,
			newBufferData,
		};
	}
}
