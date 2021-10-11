export default class WebGpuPipelineConfig {
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
