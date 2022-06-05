import {RendererDomTarget} from "../../RendererDomTarget.js";
import {RenderOutputConfig} from "../../RenderOutputConfig.js";

export class WebGpuRendererDomTarget extends RendererDomTarget {
	/**
	 * @param {import("./WebGpuRenderer.js").WebGpuRenderer} renderer
	 * @param {Object} opts
	 * @param {boolean} [opts.depthSupport]
	 */
	constructor(renderer, {
		depthSupport = true,
	} = {}) {
		super(renderer);

		this._outputConfig = new RenderOutputConfig();
		this.depthSupport = depthSupport; // todo: use output config

		this.canvas = document.createElement("canvas");
		this.width = this.canvas.width;
		this.height = this.canvas.height;
		this.ctx = this.canvas.getContext("webgpu");
		this.swapChainFormat = null;
		this.colorTexture = null;
		this.colorTextureView = null;
		this.depthTexture = null;
		this.ready = false;

		/** @type {GPURenderPassColorAttachment?} */
		this.colorAttachment = null;

		/** @type {GPURenderPassDepthStencilAttachment?} */
		this.depthStencilAttachment = null;

		/** @type {GPURenderPassDescriptor} */
		this.renderPassDescriptor = {
			colorAttachments: [this.colorAttachment],
		};
	}

	/**
	 * @returns {import("./WebGpuRenderer.js").WebGpuRenderer}
	 */
	get castRenderer() {
		return /** @type {import("./WebGpuRenderer.js").WebGpuRenderer} */ (this.renderer);
	}

	gpuReady() {
		if (!this.ctx) return;
		const renderer = this.castRenderer;
		if (renderer.adapter) {
			this.swapChainFormat = navigator.gpu.getPreferredCanvasFormat();
		}

		this.ready = true;
		this.generateTextures();
	}

	getElement() {
		return this.canvas;
	}

	/**
	 * @override
	 * @param {number} w Width.
	 * @param {number} h Height.
	 */
	resize(w, h) {
		super.resize(w, h);
		this.canvas.width = w;
		this.canvas.height = h;
		this.generateTextures();
	}

	get outputConfig() {
		return this._outputConfig;
	}

	/**
	 * @param {RenderOutputConfig} outputConfig
	 */
	setRenderOutputConfig(outputConfig) {
		// todo: add support for cloning config and filling in fragmentTargets
		// with preferred swapchain format
		this._outputConfig = outputConfig;
		this.generateTextures();
	}

	generateTextures() {
		if (!this.ready || !this.ctx) return;
		const device = this.castRenderer.device;
		if (!device) return;
		if (!this.swapChainFormat) return;

		this.ctx.configure({
			device,
			format: this.swapChainFormat,
			alphaMode: "opaque",
		});

		if (this.colorTexture) this.colorTexture.destroy();
		this.colorTexture = null;
		if (this.outputConfig.multisampleCount > 1 && this.width > 0 && this.height > 0) {
			this.colorTexture = device.createTexture({
				label: "WebGpuDomTarget colorTexture",
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

		if (this.depthTexture) this.depthTexture.destroy();
		this.depthTexture = null;
		if (this.depthSupport && this.width > 0 && this.height > 0) {
			this.depthTexture = device.createTexture({
				label: "WebGpuDomTarget depthTexture",
				size: {
					width: this.canvas.width,
					height: this.canvas.height,
				},
				sampleCount: this.outputConfig.multisampleCount,
				format: this.outputConfig.depthStencilFormat,
				usage: GPUTextureUsage.RENDER_ATTACHMENT,
			});

			/** @type {GPURenderPassDepthStencilAttachment} */
			// @ts-expect-error Deno still has old types containing 'loadValue'
			const attachment = {
				view: this.depthTexture.createView(),
				depthLoadOp: "clear",
				depthClearValue: 1,
				depthStoreOp: "store",
			};
			this.depthStencilAttachment = attachment;

			this.renderPassDescriptor.depthStencilAttachment = this.depthStencilAttachment;
		}
	}

	/**
	 * @returns {GPURenderPassDescriptor?}
	 */
	getRenderPassDescriptor() {
		if (!this.ready || !this.ctx) return null;
		const swapChainTextureView = this.ctx.getCurrentTexture().createView();
		let view;
		let resolveTarget;
		if (this.outputConfig.multisampleCount == 1) {
			view = swapChainTextureView;
			resolveTarget = undefined;
		} else if (this.colorTextureView) {
			view = this.colorTextureView;
			resolveTarget = swapChainTextureView;
		} else {
			return null;
		}

		// @ts-expect-error Deno still has old types containing 'loadValue'
		this.colorAttachment = {
			view,
			resolveTarget,
			loadOp: "clear",
			clearValue: {r: 0, g: 0, b: 0, a: 1},
			storeOp: "store",
		};
		this.renderPassDescriptor.colorAttachments = [this.colorAttachment];

		return this.renderPassDescriptor;
	}
}
