export default class WebGpuPipelineConfiguration{
	constructor({
		fragmentShader = null,
		vertexShader = null,
	} = {}){
		this.fragmentShader = fragmentShader;
		this.vertexShader = vertexShader;
	}
}
