export class RenderOutputConfig {
	/**
	 * @param {object} options
	 * @param {GPUTextureFormat} [options.depthStencilFormat]
	 * @param {number} [options.multisampleCount]
	 * @param {Iterable<GPUColorTargetState>} [options.fragmentTargets]
	 */
	constructor({
		depthStencilFormat = "depth24plus",
		multisampleCount = 4,
		fragmentTargets = [{format: "bgra8unorm"}],
	} = {}) {
		this.depthStencilFormat = (depthStencilFormat);
		this.multisampleCount = multisampleCount;
		this.fragmentTargets = fragmentTargets;
	}
}
