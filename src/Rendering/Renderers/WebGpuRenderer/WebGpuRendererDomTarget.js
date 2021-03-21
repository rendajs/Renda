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
			attachment: null, //will be assigned in getRenderPassDescriptor()
			resolveTarget: null, //will be assigned in getRenderPassDescriptor()
			loadValue: {r: 0, g: 0.2, b: 0.5, a: 1},
		}
		this.depthStencilAttachment = null;
		if(this.depthSupport){
			this.depthStencilAttachment = {
				attachment: null, //will be assigned in generateTextures()
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

	gpuReady(){
		this.swapChainFormat = this.ctx.getSwapChainPreferredFormat(this.renderer.adapter);
		this.swapChain = this.ctx.configureSwapChain({
			device: this.renderer.device,
			format: this.swapChainFormat,
		});

		this.ready = true;
		this.generateTextures();
	}

	getElement(){
		return this.canvas;
	}

	resize(w,h){
		super.resize(w,h);
		this.canvas.width = w;
		this.canvas.height = h;
		this.generateTextures();
	}

	generateTextures(){
		if(!this.ready) return;
		if(this.sampleCount > 1){
			if(this.colorTexture) this.colorTexture.destroy();
			this.colorTexture = this.renderer.device.createTexture({
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
			if(this.depthTexture) this.depthTexture.destroy();
			this.depthTexture = this.renderer.device.createTexture({
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
