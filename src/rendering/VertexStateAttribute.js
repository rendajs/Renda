import {Mesh} from "../core/Mesh.js";

/**
 * @typedef VertexStateAttributeOptions
 * @property {number} [componentCount]
 * @property {number} [format]
 * @property {boolean} [unsigned]
 * @property {number | null | "auto"} [shaderLocation]
 * @property {import("../core/Mesh.js").AttributeType | keyof (typeof import("../core/Mesh.js").Mesh)["AttributeType"]} [attributeType]
 */

export class VertexStateAttribute {
	/**
	 * @param {VertexStateAttributeOptions} options
	 */
	constructor({
		componentCount = 3,
		format = Mesh.AttributeFormat.FLOAT32,
		unsigned = false,
		shaderLocation = null, // use null|-1|"auto" for auto
		attributeType = 0,
	} = {}) {
		this.componentCount = componentCount;
		if (typeof format == "string") {
			format = Mesh.AttributeFormat[format];
		}
		this.format = format;
		this.unsigned = unsigned;
		this.shaderLocation = shaderLocation;
		if (typeof attributeType == "string") {
			attributeType = Mesh.AttributeType[attributeType];
		}
		this.attributeType = attributeType;

		this.offset = 0;
	}

	/**
	 * @param {import("./VertexState.js").RequestShaderLocationFn} requestShaderLocationFn
	 * @param {import("./VertexStateBuffer.js").VertexStateBuffer} vertexBuffer
	 */
	getDescriptor(requestShaderLocationFn, vertexBuffer) {
		const format = this.getDescriptorFormat();
		const offset = vertexBuffer.requestAttributeOffset(this.byteSize);
		this.offset = offset;
		let shaderLocation = this.shaderLocation;
		if (shaderLocation == null || shaderLocation == "auto" || shaderLocation == -1) {
			shaderLocation = requestShaderLocationFn(this.attributeType);
		}
		/** @type {GPUVertexAttribute} */
		const vertexStateAttribute = {
			format,
			offset,
			shaderLocation,
		};
		return vertexStateAttribute;
	}

	/**
	 * @param {number} offset
	 */
	setOffset(offset) {
		this.offset = offset;
	}

	get byteSize() {
		return this.componentCount * Mesh.getByteLengthForAttributeFormat(this.format);
	}

	getDescriptorFormat() {
		let str = "";
		switch (this.format) {
			case Mesh.AttributeFormat.INT8:
			case Mesh.AttributeFormat.INT16:
			case Mesh.AttributeFormat.INT32:
			case Mesh.AttributeFormat.NORM8:
			case Mesh.AttributeFormat.NORM16:
				str += this.unsigned ? "u" : "s";
		}
		switch (this.format) {
			case Mesh.AttributeFormat.INT8:
				str += "int8";
				break;
			case Mesh.AttributeFormat.INT16:
				str += "int16";
				break;
			case Mesh.AttributeFormat.INT32:
				str += "int32";
				break;
			case Mesh.AttributeFormat.FLOAT16:
				str += "float16";
				break;
			case Mesh.AttributeFormat.FLOAT32:
				str += "float32";
				break;
			case Mesh.AttributeFormat.NORM8:
				str += "norm8";
				break;
			case Mesh.AttributeFormat.NORM16:
				str += "norm16";
				break;
		}
		if (this.componentCount > 1) {
			str += "x" + this.componentCount;
		}
		return /** @type {GPUVertexFormat} */ (str);
	}
}
