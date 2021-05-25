export default class RenderOutputConfig{
	constructor({
		depthStencilFormat = "depth24plus",
		multisampleCount = 4,
		fragmentTargets = [{format: "bgra8unorm"}],
	} = {}){
		this.depthStencilFormat = depthStencilFormat;
		this.multisampleCount = multisampleCount;
		this.fragmentTargets = fragmentTargets;
	}
}
