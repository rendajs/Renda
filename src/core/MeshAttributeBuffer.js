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

	get isUnused() {
		return this.#internalAttributeBuffer.isUnused;
	}
}
