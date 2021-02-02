import RendererDomTarget from "../../RendererDomTarget.js";

export default class WebGpuRendererDomTarget extends RendererDomTarget{
	constructor(renderer, {
		sampleCount = 4, //msaa
		depthSupport = true,
		depthFormat = "depth24plus-stencil8",
	} = {}){
		super(...arguments);

		this.sampleCount = sampleCount;
		this.depthSupport = depthSupport;
		this.depthFormat = depthFormat;

		this.canvas = document.createElement("canvas");
		this.ctx = this.canvas.getContext("gpupresent");
		this.swapChainFormat = null;
		this.swapChain = null;
		this.colorTexture = null;
		this.colorTextureView = null;
		this.depthTexture = null;
		this.ready = false;

		this.colorAttachment = {
			attachment: null, //will be assigned in getRenderPassDescriptor() or resize()
			resolveTarget: null, //will be assigned in getRenderPassDescriptor()
			loadValue: {r: 0, g: 0.2, b: 0.5, a: 1},
		}
		this.depthStencilAttachment = null;
		if(this.depthSupport){
			this.depthStencilAttachment = {
				attachment: null, //will be assigned in resize()
				depthLoadValue: 1,
				depthStoreOp: "store",
				stencilLoadValue: 1,
				stencilStoreOp: "store",
			}
		}
		this.renderPassDescriptor = {
			colorAttachments: [this.colorAttachment],
			depthStencilAttachment: this.depthStencilAttachment,
		}
	}

	configureSwapChain(adapter, device){
		this.swapChainFormat = this.ctx.getSwapChainPreferredFormat(adapter);
		this.swapChain = this.ctx.configureSwapChain({
			device,
			format: this.swapChainFormat,
		});

		if(this.sampleCount > 1){
			this.colorTexture = device.createTexture({
				size: {
					width: this.canvas.width,
					height: this.canvas.height,
				},
				sampleCount: this.sampleCount,
				format: this.swapChainFormat,
				usage: GPUTextureUsage.RENDER_ATTACHMENT,
			});
			this.colorTextureView = this.colorTexture.createView();
		}
		if(this.depthSupport){
			this.depthTexture = device.createTexture({
				size: {
					width: this.canvas.width,
					height: this.canvas.height,
				},
				sampleCount: this.sampleCount,
				format: this.depthFormat,
				usage: GPUTextureUsage.RENDER_ATTACHMENT,
			});
			this.depthStencilAttachment.attachment = this.depthTexture.createView();
		}
		this.ready = true;
	}

	getElement(){
		return this.canvas;
	}

	resize(w,h){
		this.canvas.width = w;
		this.canvas.height = h;
	}

	getRenderPassDescriptor(){
		if(!this.ready) return null;
		const swapChainTextureView = this.swapChain.getCurrentTexture().createView();
		if(this.sampleCount == 1){
			this.colorAttachment.attachment = swapChainTextureView;
		}else{
			this.colorAttachment.attachment = this.colorTextureView;
			this.colorAttachment.resolveTarget = swapChainTextureView;
		}
		return this.renderPassDescriptor;
	}
}
