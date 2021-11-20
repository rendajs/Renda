export class WebGpuPipelineConfig {
	/**
	 * @param {Object} options
	 * @param {import("../../ShaderSource.js").ShaderSource} [options.fragmentShader]
	 * @param {import("../../ShaderSource.js").ShaderSource} [options.vertexShader]
	 * @param {GPUPrimitiveTopology} [options.primitiveTopology]
	 */
	constructor({
		fragmentShader = null,
		vertexShader = null,
		primitiveTopology = "triangle-list",
	} = {}) {
		this.fragmentShader = fragmentShader;
		this.vertexShader = vertexShader;
		this.primitiveTopology = primitiveTopology;
	}
}
