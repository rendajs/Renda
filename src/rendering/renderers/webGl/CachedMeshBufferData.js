import { Mesh } from "../../../core/Mesh.js";

export class CachedMeshBufferData {
	#meshBuffer;
	#vertexStateBuffer;
	#cachedMeshData;

	#bufferDirty = true;
	/** @type {WebGLBuffer?} */
	#gpuBuffer = null;

	/**
	 * @param {import("../../../core/MeshAttributeBuffer.js").MeshAttributeBuffer} meshBuffer
	 * @param {import("../../VertexStateBuffer.js").VertexStateBuffer} vertexStateBuffer
	 * @param {import("./CachedMeshData.js").CachedMeshData} meshData
	 */
	constructor(meshBuffer, vertexStateBuffer, meshData) {
		this.#meshBuffer = meshBuffer;
		this.#vertexStateBuffer = vertexStateBuffer;
		this.#cachedMeshData = meshData;

		meshBuffer.onBufferChanged(this.#onBufferChanged);
	}

	destructor() {
		this.#meshBuffer.removeOnBufferChanged(this.#onBufferChanged);
	}

	#onBufferChanged = () => {
		this.#bufferDirty = true;
	};

	#createGpuBuffer() {
		const gl = this.#cachedMeshData.renderer.getWebGlContext();

		if (this.#gpuBuffer) {
			gl.deleteBuffer(this.#gpuBuffer);
			this.#gpuBuffer = null;
		}

		this.#gpuBuffer = gl.createBuffer();
		if (!this.#gpuBuffer) throw new Error("Failed to create buffer.");
		const bufferType = gl.ARRAY_BUFFER;
		gl.bindBuffer(bufferType, this.#gpuBuffer);
		gl.bufferData(bufferType, this.#meshBuffer.buffer, gl.STATIC_DRAW);
	}

	getGpuPointerData() {
		const gl = this.#cachedMeshData.renderer.getWebGlContext();

		if (this.#bufferDirty) {
			this.#createGpuBuffer();
			this.#bufferDirty = false;
		}
		if (!this.#gpuBuffer) {
			throw new Error("Assertion failed: buffer was not created");
		}

		const attributes = [];
		let i = 0;
		for (const attributeSettings of this.#meshBuffer.attributeSettings) {
			let type;
			const normalized = false;
			if (attributeSettings.format == Mesh.AttributeFormat.FLOAT32) {
				type = gl.FLOAT;
			} else if (attributeSettings.format == Mesh.AttributeFormat.INT8) {
				type = gl.BYTE;
			} else if (attributeSettings.format == Mesh.AttributeFormat.INT16) {
				type = gl.SHORT;
			} else {
				throw new Error("Mesh has an unsupported attribute format");
			}
			const vertexStateAttribute = this.#vertexStateBuffer.attributes[i];
			const shaderLocation = vertexStateAttribute.shaderLocation;
			if (shaderLocation == null || shaderLocation == "auto" || shaderLocation < 0) {
				throw new Error("Automatic shader locations are not supported in the webgl renderer.");
			}
			attributes.push({
				componentCount: attributeSettings.componentCount,
				type,
				normalized,
				offset: 0, // TODO
				shaderLocation,
			});
			i++;
		}

		return {
			attributes,
			buffer: this.#gpuBuffer,
			stride: this.#meshBuffer.arrayStride,
		};
	}
}
