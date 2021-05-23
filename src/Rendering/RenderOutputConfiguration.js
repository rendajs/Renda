export default class RenderOutputConfiguration{
	constructor({
		depthStencilFormat = "depth24plus",
		multisampleCount = 1,
		fragmentTargets = [{format: "bgra8unorm"}],
	} = {}){
		this.depthStencilFormat = depthStencilFormat;
		this.multisampleCount = multisampleCount;
		this.fragmentTargets = fragmentTargets;
	}
}
