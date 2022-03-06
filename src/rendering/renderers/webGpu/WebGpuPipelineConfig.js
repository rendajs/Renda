export class WebGpuPipelineConfig {
	/**
	 * @param {Object} options
	 * @param {import("../../ShaderSource.js").ShaderSource?} [options.fragmentShader]
	 * @param {import("../../ShaderSource.js").ShaderSource?} [options.vertexShader]
	 * @param {GPUPrimitiveTopology} [options.primitiveTopology]
	 * @param {GPUCompareFunction} [options.depthCompareFunction]
	 * @param {boolean} [options.depthWriteEnabled]
	 */
	constructor({
		fragmentShader = null,
		vertexShader = null,
		primitiveTopology = "triangle-list",
		depthCompareFunction = "less",
		depthWriteEnabled = true,
	} = {}) {
		this.fragmentShader = fragmentShader;
		this.vertexShader = vertexShader;
		this.primitiveTopology = primitiveTopology;
		this.depthCompareFunction = depthCompareFunction;
		this.depthWriteEnabled = depthWriteEnabled;
	}
}
