/**
 * @typedef AssetBundleGetAssetResult
 * @property {ArrayBuffer} buffer
 * @property {import("../../util/util.js").UuidString} type
 */

/**
 * An AssetBundle represents a collection of assets in their raw form.
 * You typically add an AssetBundle to an AssetLoader via the `AssetLoader.addBundle()` method.
 * An AssetBundle doesn't do much by itself, but it can be extended to add functionality for fetching assets.
 * See DownloadableAssetBundle for an example.
 */
export class AssetBundle {
	/**
	 * Returns a boolean indicating whether this bundle can provide the asset with the specified uuid.
	 * @param {import("../../util/util.js").UuidString} uuid
	 */
	async hasAsset(uuid) {
		return false;
	}

	/**
	 * Returns a promise that resolves once the data of the asset has been downloaded.
	 * If it turns out this bundle doesn't have the asset, the promise will resolve
	 * with `false` once this becomes known.
	 * @param {import("../../util/util.js").UuidString} uuid
	 */
	async waitForAssetAvailable(uuid) {
		return false;
	}

	/**
	 * Returns the type of the asset and an ArrayBuffer with the asset data.
	 * This returns null if the bundle doesn't have the asset.
	 * @param {import("../../util/util.js").UuidString} uuid
	 * @returns {Promise<AssetBundleGetAssetResult | null>}
	 */
	async getAsset(uuid) {
		return null;
	}
}
