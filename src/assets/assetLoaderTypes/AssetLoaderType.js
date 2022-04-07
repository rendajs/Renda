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
	 * @param {*} [assetOpts]
	 * @returns {Promise<*>}
	 */
	async parseBuffer(buffer, assetOpts) {}
}
