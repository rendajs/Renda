export class GPUBuffer {
	#buffer;
	#label;

	/**
	 * @param {GPUBufferDescriptor} descriptor
	 */
	constructor({
		size,
		label = "",
	}) {
		this.#label = label;
		this.#buffer = new ArrayBuffer(size);
	}

	get label() {
		return this.#label;
	}

	/**
	 * @param {number} [offset]
	 * @param {number} [size]
	 */
	getMappedRange(offset, size) {
		size = size ?? this.#buffer.byteLength;
		return new ArrayBuffer(size);
	}

	unmap() {}
}
