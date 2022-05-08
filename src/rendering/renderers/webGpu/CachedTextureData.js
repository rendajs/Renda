export class CachedTextureData {
	#device;
	#texture;
	#gpuTexture;

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
		this.#gpuTexture = renderer.device.createTexture({
			// TODO: add size property to textures
			size: [512, 512, 1],
			format: "rgba8unorm",
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
		});

		this.init();
	}

	/**
	 * @private
	 */
	async init() {
		const imageBitmap = await createImageBitmap(this.#texture.blob);
		this.#device.queue.copyExternalImageToTexture({
			source: imageBitmap,
			flipY: true,
		}, {
			texture: this.#gpuTexture,
		}, [imageBitmap.width, imageBitmap.height, 1]);
	}

	createView() {
		return this.#gpuTexture.createView();
	}
}
