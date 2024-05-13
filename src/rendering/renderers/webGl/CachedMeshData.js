import { CachedMeshBufferData } from "./CachedMeshBufferData.js";

export class CachedMeshData {
	#mesh;
	#renderer;
	get renderer() {
		return this.#renderer;
	}

	/** @type {WebGLBuffer?} */
	#indexBuffer = null;
	#indexBufferDirty = false;

	/** @type {CachedMeshBufferData[]} */
	#buffers = [];

	/**
	 * @param {import("../../../core/Mesh.js").Mesh} mesh
	 * @param {import("./WebGlRenderer.js").WebGlRenderer} renderer
	 */
	constructor(mesh, renderer) {
		this.#mesh = mesh;
		this.#renderer = renderer;

		// todo: remove old bufferdata when the list of buffers changes
		this.#buffers = [];
		for (const meshBuffer of mesh.getAttributeBuffers(false)) {
			const bufferData = new CachedMeshBufferData(meshBuffer, this);
			this.#buffers.push(bufferData);
		}

		this.createIndexGpuBuffer();

		// todo: remove listeners when webglrenderer is destroyed
		this.#indexBufferDirty = false;
		this.#mesh.onIndexBufferChange(this.#onIndexBufferChange);
	}

	destructor() {
		this.#mesh.removeOnIndexBufferChange(this.#onIndexBufferChange);
	}

	#onIndexBufferChange = () => {
		this.#indexBufferDirty = true;
	};

	createIndexGpuBuffer() {
		const gl = this.#renderer.getWebGlContext();
		if (this.#indexBuffer) {
			gl.deleteBuffer(this.#indexBuffer);
			this.#indexBuffer = null;
		}
		if (this.#mesh.indexBuffer) {
			const indexBuffer = gl.createBuffer();
			if (!indexBuffer) throw new Error("Failed to create buffer.");
			const bufferType = gl.ELEMENT_ARRAY_BUFFER;
			gl.bindBuffer(bufferType, indexBuffer);
			gl.bufferData(bufferType, this.#mesh.indexBuffer, gl.STATIC_DRAW);
			this.#indexBuffer = indexBuffer;
		}
	}

	*getAttributeBufferData() {
		for (const buffer of this.#buffers.values()) {
			yield buffer.getGpuPointerData();
		}
	}

	getIndexBufferData() {
		if (this.#indexBufferDirty) {
			this.createIndexGpuBuffer();
		}
		if (!this.#indexBuffer) {
			throw new Error("Assertion failed: index buffer was not created");
		}
		return {
			buffer: this.#indexBuffer,
			count: this.#mesh.indexCount,
		};
	}
}
