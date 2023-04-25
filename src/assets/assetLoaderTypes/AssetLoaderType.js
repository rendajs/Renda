/**
 * @template TReturnType
 * @template [TAssetOpts = undefined]
 */
export class AssetLoaderType {
	/**
	 * Uuid of the loader type. This should match the uuid used in
	 * ProjectAssetType.js.
	 *
	 * Asset bundles automatically include the asset type uuid in the bundle,
	 * so when loading an asset bundle, the asset loader type that should be
	 * used is determined by the asset type uuid in the bundle.
	 * @returns {import("../../util/util.js").UuidString}
	 */
	static get typeUuid() {
		return "";
	}

	/**
	 * @param {import("../AssetLoader.js").AssetLoader} assetLoader
	 */
	constructor(assetLoader) {
		this.assetLoader = assetLoader;
	}

	/**
	 * This method should parse an ArrayBuffer and return an
	 * instance of the desired class such as a Mesh or Texture.
	 * @param {ArrayBuffer} buffer
	 * @param {import("../RecursionTracker.js").RecursionTracker} recursionTracker
	 * @param {TAssetOpts} [assetOpts]
	 * @returns {Promise<TReturnType>}
	 */
	async parseBuffer(buffer, recursionTracker, assetOpts) {
		throw new Error("parseBuffer has not been implemented for this loader type.");
	}
}
