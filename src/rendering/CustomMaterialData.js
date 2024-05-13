/**
 * CustomMaterialData is used for providing data to shaders that is more complex than simple scalars or vectors.
 * If a shader requires more complex data, like nested structs or an array of matrices,
 * you can use this to manually provide a renderer with data and control how it should be parsed on a low level.
 */
export class CustomMaterialData {
	/** @type {Map<ObjectWithSignature, () => void>} */
	#callbacks = new Map();

	/**
	 * CustomMaterialData allows you to provide a renderer with shader uniform data on a low level.
	 *
	 * Usage depends on which renderer you are using,
	 * since each renderer expects custom data to be provided in a different way.
	 * It is possible to register multiple callbacks for different renderers.
	 * That way you can reuse the same Material accross different renderers.
	 *
	 * ## Usage
	 * ```js
	 * const renderer = new WebGpuRenderer(engineAssetsManager);
	 * const customData = new CustomMaterialData();
	 * myMaterial.setProperty("customData", customData);
	 * customData.registerCallback(renderer, (group) => {
	 * 	// In this case we are using a WebGpuRenderer, so the `group` argument will be a `WebGpuChunkedBufferGroup`.
	 * 	// But the expected arguments will differ depending on which renderer you use.
	 * 	// Consult the documentation of `_customMaterialDataSignature` on the renderer that you use for more info.
	 * })
	 * ```
	 */
	// eslint-disable-next-line no-useless-constructor
	constructor() {}

	/**
	 * @typedef {{_customMaterialDataSignature: (...args: any[]) => any}} ObjectWithSignature
	 */

	/**
	 * @template {ObjectWithSignature} T
	 * @typedef {T["_customMaterialDataSignature"]} ExtractSignature
	 */

	/**
	 * You can register different callbacks for each renderer you want to support.
	 *
	 * ## Usage
	 * ```js
	 * const webGpuRenderer = new WebGpuRenderer(engineAssetsManager);
	 * const webGlRenderer = new WebGlRenderer();
	 * const customData = new CustomMaterialData();
	 * customData.registerCallback(webGpuRenderer, (group) => {
	 * 	// ...
	 * });
	 * customData.registerCallback(webGlRenderer, (gl, location) => {
	 * 	// ...
	 * });
	 * ```
	 * Consult the documentation of `_customMaterialDataSignature` on the renderer that you use for
	 * more info on what your callback should look like.
	 * @template {ObjectWithSignature} T
	 * @param {T} renderer
	 * @param {T["_customMaterialDataSignature"]} callback
	 */
	registerCallback(renderer, callback) {
		this.#callbacks.set(renderer, callback);
	}

	/**
	 * @template {ObjectWithSignature} T
	 * @param {T} renderer
	 * @param {Parameters<ExtractSignature<T>>} args
	 * @returns {ReturnType<ExtractSignature<T>>}
	 */
	fireCallback(renderer, ...args) {
		const callback = this.#callbacks.get(renderer);
		if (!callback) {
			throw new Error("No callback was registered for this renderer. Make sure to register one with CustomMaterialData.registerCallback().");
		}
		const castCallback = /** @type {ExtractSignature<T>} */ (callback);
		return castCallback(...args);
	}
}
