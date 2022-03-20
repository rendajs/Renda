import {VertexStateBuffer} from "./VertexStateBuffer.js";

/**
 * @typedef VertexStateOptions
 * @property {import("./VertexStateBuffer.js").VertexStateBufferOptions[]} [buffers]
 */

export class VertexState {
	/**
	 * @param {VertexStateOptions} options
	 */
	constructor({
		buffers = [],
	} = {}) {
		/** @type {VertexStateBuffer[]} */
		this.buffers = [];

		for (const buffer of buffers) {
			this.addBuffer(buffer);
		}

		this.requestingShaderLocationIndex = 0;
	}

	/**
	 * @param {import("./VertexStateBuffer.js").VertexStateBufferOptions} options
	 */
	addBuffer(options) {
		const buffer = new VertexStateBuffer(options);
		this.buffers.push(buffer);
	}

	getDescriptor() {
		this.requestingShaderLocationIndex = 0;
		const buffers = this.buffers.map(b => b.getDescriptor(this));
		const descriptor = {buffers};
		return descriptor;
	}

	requestShaderLocationIndex() {
		return this.requestingShaderLocationIndex++;
	}

	*getBuffers() {
		for (const buffer of this.buffers) {
			yield buffer;
		}
	}
}
