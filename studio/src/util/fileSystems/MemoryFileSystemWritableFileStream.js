/**
 * This is not an exact implementation according to the spec but it works in most cases.
 */
export class MemoryFileSystemWritableFileStream extends WritableStream {
	#cursor = 0;
	/**
	 * @param {import("./MemoryStudioFileSystem.js").MemoryStudioFileSystemFilePointer} pointer
	 */
	constructor(pointer) {
		super();
		this.pointer = pointer;
	}

	/**
	 * @param  {FileSystemWriteChunkType} data
	 */
	async write(data) {
		if (data instanceof ArrayBuffer || ArrayBuffer.isView(data) || data instanceof Blob || typeof data == "string") {
			await this.#writeChunk(data);
		} else if (data.type == "seek") {
			return await this.seek(data.position);
		} else if (data.type == "truncate") {
			return await this.truncate(data.size);
		} else if (data.type == "write") {
			if (data.position !== undefined) {
				await this.seek(data.position);
			}
			await this.#writeChunk(data.data);
		}
	}

	/**
	 * @param {string | BufferSource | Blob} chunk
	 */
	async #writeChunk(chunk) {
		let buffer;
		if (chunk instanceof ArrayBuffer) {
			buffer = chunk;
		} else if (ArrayBuffer.isView(chunk)) {
			buffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
		} else if (chunk instanceof Blob) {
			buffer = await chunk.arrayBuffer();
		} else {
			buffer = new TextEncoder().encode(chunk);
		}

		const existingBuffer = await this.pointer.file.arrayBuffer();
		const newBufferLength = Math.max(existingBuffer.byteLength, this.#cursor + buffer.byteLength);
		const newBuffer = new Uint8Array(newBufferLength);
		newBuffer.set(new Uint8Array(existingBuffer), 0);
		newBuffer.set(new Uint8Array(buffer), this.#cursor);
		this.#cursor += buffer.byteLength;
		this.pointer.file = new File([newBuffer], this.pointer.file.name, {type: this.pointer.file.type});
	}

	/**
	 * @param {number} position
	 */
	async seek(position) {
		this.#cursor = position;
	}

	/**
	 * @param {number} size
	 */
	async truncate(size) {
		throw new Error("Truncate not implemented");
	}
}
