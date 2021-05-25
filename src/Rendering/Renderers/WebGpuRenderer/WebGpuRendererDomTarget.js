import RendererDomTarget from "../../RendererDomTarget.js";
import RenderOutputConfig from "../../RenderOutputConfig.js";

export default class WebGpuRendererDomTarget extends RendererDomTarget{
	constructor(renderer, {
		depthSupport = true,
	} = {}){
		super(...arguments);

		this._outputConfig = new RenderOutputConfig();
		this.depthSupport = depthSupport; //todo: use output config

		this.canvas = document.createElement("canvas");
		this.ctx = this.canvas.getContext("gpupresent");
		this.swapChainFormat = null;
		this.swapChain = null;
		this.colorTexture = null;
		this.colorTextureView = null;
		this.depthTexture = null;
		this.ready = false;

		this.colorAttachment = {
			view: null, //will be assigned in getRenderPassDescriptor()
			resolveTarget: undefined, //will be assigned in getRenderPassDescriptor()
			loadValue: {r: 0, g: 0.2, b: 0.5, a: 1},
		}
		this.depthStencilAttachment = null;
		if(this.depthSupport){
			this.depthStencilAttachment = {
				view: null, //will be assigned in generateTextures()
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

	get outputConfig(){
		return this._outputConfig;
	}

	setRenderOutputConfig(outputConfig){
		//todo: add support for cloning config and filling in fragmentTargets
		//with preferred swapchain format
		this._outputConfig = outputConfig;
		this.generateTextures();
	}

	generateTextures(){
		if(!this.ready) return;

		this.swapChain = this.ctx.configureSwapChain({
			device: this.renderer.device,
			format: this.swapChainFormat,
		});

		if(this.colorTexture) this.colorTexture.destroy();
		if(this.outputConfig.multisampleCount > 1){
			this.colorTexture = this.renderer.device.createTexture({
				size: {
					width: this.canvas.width,
					height: this.canvas.height,
				},
				sampleCount: this.outputConfig.multisampleCount,
				format: this.swapChainFormat,
				usage: GPUTextureUsage.RENDER_ATTACHMENT,
			});
			this.colorTextureView = this.colorTexture.createView();
		}

		if(this.depthTexture) this.depthTexture.destroy();
		if(this.depthSupport){
			this.depthTexture = this.renderer.device.createTexture({
				size: {
					width: this.canvas.width,
					height: this.canvas.height,
				},
				sampleCount: this.outputConfig.multisampleCount,
				format: this.outputConfig.depthStencilFormat,
				usage: GPUTextureUsage.RENDER_ATTACHMENT,
			});
			this.depthStencilAttachment.view = this.depthTexture.createView();
		}
	}

	getRenderPassDescriptor(){
		if(!this.ready) return null;
		const swapChainTextureView = this.swapChain.getCurrentTexture().createView();
		if(this.outputConfig.multisampleCount == 1){
			this.colorAttachment.view = swapChainTextureView;
			this.colorAttachment.resolveTarget = undefined;
		}else{
			this.colorAttachment.view = this.colorTextureView;
			this.colorAttachment.resolveTarget = swapChainTextureView;
		}
		return this.renderPassDescriptor;
	}
}
