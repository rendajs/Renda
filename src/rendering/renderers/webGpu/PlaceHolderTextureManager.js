import {PlaceHolderTexture} from "./PlaceHolderTexture.js";

/**
 * In order to make it possible to render materials with unset textures, we want
 * to generate small 1x1 textures of just a single color. This class generates
 * these textures and manages the lifecycle of them.
 */
export class PlaceHolderTextureManager {
	#renderer;

	/** @type {Map<string, PlaceHolderTexture>} */
	#createdTextures = new Map();

	/**
	 * @param {import("./WebGpuRenderer.js").WebGpuRenderer} renderer
	 */
	constructor(renderer) {
		this.#renderer = renderer;
	}

	/**
	 * Creates a texture with the specified color if it doesn't exist yet.
	 * Otherwise, returns an existing reference.
	 * @param {number[]} color
	 */
	getTexture(color) {
		if (!this.#renderer.device) {
			throw new Error("Assertion failed, renderer has no device");
		}
		const colorKey = color.join(",");
		const existing = this.#createdTextures.get(colorKey);
		if (existing) return existing;

		const texture = new PlaceHolderTexture(this.#renderer.device, color);
		this.#createdTextures.set(colorKey, texture);
		texture.onAllReferencesDestructed(() => {
			texture.destructor();
			this.#createdTextures.delete(colorKey);
		});
		return texture;
	}
}
