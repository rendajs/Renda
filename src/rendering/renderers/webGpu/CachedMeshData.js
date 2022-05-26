import {CachedMeshBufferData} from "./CachedMeshBufferData.js";

export class CachedMeshData {
	/**
	 *
	 * @param {import("../../../core/Mesh.js").Mesh} mesh
	 * @param {import("./WebGpuRenderer.js").WebGpuRenderer} renderer
	 */
	constructor(mesh, renderer) {
		this.mesh = mesh;
		this.renderer = renderer;

		// todo: remove old bufferdata when the list of buffers changes
		this.buffers = [];
		for (const meshBuffer of mesh.getBuffers(false)) {
			const bufferData = new CachedMeshBufferData(meshBuffer, this);
			this.buffers.push(bufferData);
		}

		this.indexBuffer = null;
		this.createIndexGpuBuffer();

		// todo: remove listeners when gpurenderer is destroyed
		this.indexBufferDirty = false;
		this.mesh.onIndexBufferChange(() => {
			this.indexBufferDirty = true;
		});
	}

	destructor() {
		// todo
	}

	createIndexGpuBuffer() {
		if (this.indexBuffer) {
			this.indexBuffer.destroy();
			this.indexBuffer = null;
		}
		if (!this.renderer.isInit || !this.renderer.device) {
			throw new Error("Failed to create gpu buffer: renderer not initialized");
		}
		if (this.mesh.indexBuffer) {
			const indexBuffer = this.renderer.device.createBuffer({
				label: "CachedMeshDataIndexBuffer",
				size: this.mesh.indexBuffer.byteLength,
				usage: GPUBufferUsage.INDEX,
				mappedAtCreation: true,
			});
			new Uint8Array(indexBuffer.getMappedRange()).set(new Uint8Array(this.mesh.indexBuffer));
			indexBuffer.unmap();
			this.indexBuffer = indexBuffer;
		}
	}

	*getVertexBufferGpuCommands() {
		for (const [i, buffer] of this.buffers.entries()) {
			yield {
				/** The index needs to be passed in `encoder.setVertexBuffer()`, this is the same as the index of the buffer in the VertexState of the mesh. */
				index: i,
				...buffer.getVertexBufferGpuCommand(),
			};
		}
	}

	getIndexedBufferGpuCommands() {
		// todo: support for dynamic indexbuffer updates using GPUBufferUsage.COPY_DST and device.queue.writeBuffer
		if (this.indexBufferDirty) {
			this.createIndexGpuBuffer();
		}
		if (!this.indexBuffer) {
			throw new Error("Assertion failed: index buffer was not created");
		}
		return this.indexBuffer;
	}
}
