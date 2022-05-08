export class CachedTextureData {
	#device;
	#texture;
	/** @type {GPUTexture?} */
	#gpuTexture = null;

	/**
	 * @param {import("./WebGpuRenderer.js").WebGpuRenderer} renderer
	 * @param {import("../../../core/Texture.js").Texture} texture
	 */
	constructor(renderer, texture) {
		if (!renderer.device) {
			throw new Error("Cannot create texture data without a WebGpu device.");
		}
		this.#device = renderer.device;
		this.#texture = texture;

		this.init();
	}

	/**
	 * @private
	 */
	async init() {
		const imageBitmap = await createImageBitmap(this.#texture.blob);
		this.#gpuTexture = this.#device.createTexture({
			// TODO: add size property to textures
			size: [imageBitmap.width, imageBitmap.height, 1],
			format: "rgba8unorm",
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
		});
		this.#device.queue.copyExternalImageToTexture({
			source: imageBitmap,
			flipY: true,
		}, {
			texture: this.#gpuTexture,
		}, [imageBitmap.width, imageBitmap.height, 1]);
	}

	createView() {
		if (!this.#gpuTexture) return null;
		return this.#gpuTexture.createView();
	}
}
