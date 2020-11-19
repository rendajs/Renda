import RendererDomTarget from "../../RendererDomTarget.js";

export default class WebGpuRendererDomTarget extends RendererDomTarget{
	constructor(){
		super(...arguments);

		this.canvas = document.createElement("canvas");
		this.ctx = this.canvas.getContext("gpupresent");
		this.swapChainFormat = null;
		this.swapChain = null;
	}

	async configureSwapChain(device){
		this.swapChainFormat = await this.ctx.getSwapChainPreferredFormat(device);
		this.swapChain = this.ctx.configureSwapChain({
			device,
			format: this.swapChainFormat,
		});
	}

	getElement(){
		return this.canvas;
	}

	resize(w,h){
		this.canvas.width = w;
		this.canvas.height = h;
	}
}
