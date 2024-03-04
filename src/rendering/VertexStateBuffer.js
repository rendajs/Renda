import { VertexStateAttribute } from "./VertexStateAttribute.js";

/**
 * @typedef VertexStateBufferOptions
 * @property {GPUVertexStepMode} [stepMode]
 * @property {number | null | "auto"} [arrayStride]
 * @property {import("./VertexStateAttribute.js").VertexStateAttributeOptions[]} [attributes]
 */

export class VertexStateBuffer {
	/**
	 * @param {VertexStateBufferOptions} param0
	 */
	constructor({
		stepMode = "vertex",
		arrayStride = null, // use null|-1|"auto" for auto stride
		attributes = [],
	} = {}) {
		this.stepMode = stepMode;
		/** @private */
		this._customArrayStride = 0;
		if (typeof arrayStride == "number") {
			this._customArrayStride = arrayStride;
		}
		this.autoArrayStride = arrayStride == null || arrayStride == "auto" || arrayStride == -1;
		this._calculatedArrayStride = 0;
		this.requestingAttributeOffset = 0;

		/** @type {VertexStateAttribute[]} */
		this.attributes = [];
		for (const attribute of attributes) {
			this.addAttribute(attribute);
		}
	}

	/**
	 * @param {import("./VertexStateAttribute.js").VertexStateAttributeOptions} options
	 */
	addAttribute(options) {
		const attribute = new VertexStateAttribute(options);
		this.attributes.push(attribute);

		this.calculateAttributeOffsets();
	}

	get arrayStride() {
		if (this.autoArrayStride) {
			return this._calculatedArrayStride;
		} else {
			return this._customArrayStride;
		}
	}

	/**
	 * @param {import("./VertexState.js").RequestShaderLocationFn} requestShaderLocationFn
	 */
	getDescriptor(requestShaderLocationFn) {
		const stepMode = this.stepMode;
		this.requestingAttributeOffset = 0;
		const attributes = [];
		for (const attribute of this.attributes) {
			attributes.push(attribute.getDescriptor(requestShaderLocationFn, this));
		}
		/** @type {GPUVertexBufferLayout} */
		const vertexStateBuffer = {
			stepMode,
			arrayStride: this.arrayStride,
			attributes,
		};
		return vertexStateBuffer;
	}

	/**
	 * @param {number} neededOffset
	 */
	requestAttributeOffset(neededOffset) {
		const oldOffset = this.requestingAttributeOffset;
		this.requestingAttributeOffset += neededOffset;
		return oldOffset;
	}

	calculateAttributeOffsets() {
		let i = 0;
		for (const attribute of this.attributes) {
			attribute.setOffset(i);
			i += attribute.byteSize;
		}
		this._calculatedArrayStride = i;
	}
}
