/** @typedef {() => void} OnBufferChangedCallback */

export class MeshAttributeBuffer {
	#internalAttributeBuffer;

	/**
	 * @param {import("./InternalMeshAttributeBuffer.js").InternalMeshAttributeBuffer} internalAttributeBuffer
	 */
	constructor(internalAttributeBuffer) {
		this.#internalAttributeBuffer = internalAttributeBuffer;
	}

	/**
	 * The underlying ArrayBuffer which contains the vertex data.
	 * This buffer gets replaced with a new `ArrayBuffer` instance whenever the vertex count is changed.
	 * Use {@linkcode onBufferChanged} to monitor for changes.
	 */
	get buffer() {
		return this.#internalAttributeBuffer.buffer;
	}

	/**
	 * Registers a callback which fires whenever the underlying buffer has either been replaced
	 * by another buffer (with a different byteLength) or when the contents of the buffer were changed
	 * due to a call to methods such as `Mesh.setVertexCount()` or `Mesh.setVertexData()`.
	 * This does not fire when the underlying buffer is manipulated directly.
	 * @param {OnBufferChangedCallback} cb
	 */
	onBufferChanged(cb) {
		this.#internalAttributeBuffer.onBufferChanged(cb);
	}

	/**
	 * An attribute buffer is 'unused' when it's attribute type is not configured in the
	 * `VertexState` of a mesh. The `VertexState` describes how attribute data is stored in the
	 * underlying ArrayBuffers. Without this information, vertex data is stored in its most basic form.
	 * This is not necessarily bad, but some renderers won't be able to make use of the vertex data from unused buffers.
	 * If a mesh doesn't have any vertex state assigned, all of its vertex buffers will be 'unused'.
	 * Once you (re)assign a VertexState, the the vertex data may be converted to a different format.
	 */
	get isUnused() {
		return this.#internalAttributeBuffer.isUnused;
	}

	/**
	 * Information about the attributes that are stored in this buffer and what format they're stored in.
	 */
	get attributeSettings() {
		return this.#internalAttributeBuffer.attributeSettings;
	}

	/**
	 * The array stride indicates how many bytes are needed to store all the data of a single vertex.
	 * This is essentially how many bytes are stored in the buffer before it starts repeating the pattern for the next vertex.
	 *
	 * For example, say each vertex contains a float32 Vec3 for positional data,
	 * then the array stride would be 3 * 4 = 12 bytes.
	 */
	get arrayStride() {
		return this.#internalAttributeBuffer.arrayStride;
	}
}
