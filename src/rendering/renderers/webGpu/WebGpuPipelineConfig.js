export class WebGpuPipelineConfig {
	/**
	 * @param {object} options
	 * @param {import("../../ShaderSource.js").ShaderSource?} [options.fragmentShader]
	 * @param {import("../../ShaderSource.js").ShaderSource?} [options.vertexShader]
	 * @param {GPUPrimitiveTopology} [options.primitiveTopology]
	 * @param {GPUCompareFunction} [options.depthCompareFunction]
	 * @param {boolean} [options.depthWriteEnabled]
	 * @param {GPUBlendState} [options.blendState]
	 * @param {number} [options.renderOrder]
	 */
	constructor({
		fragmentShader = null,
		vertexShader = null,
		primitiveTopology = "triangle-list",
		depthCompareFunction = "less",
		depthWriteEnabled = true,
		blendState,
		renderOrder = 0,
	} = {}) {
		this.fragmentShader = fragmentShader;
		this.vertexShader = vertexShader;
		this.primitiveTopology = primitiveTopology;
		this.depthCompareFunction = depthCompareFunction;
		this.depthWriteEnabled = depthWriteEnabled;
		this.blendState = blendState;
		this.renderOrder = renderOrder;
	}
}
