/**
 * @param {Object} [options]
 * @param {(liveAsset: object | null) => import("../../../../../../src/mod.js").UuidString | null} [options.getAssetUuidFromLiveAssetImpl]
 * @param {(liveAsset: object | null) => import("../../../../../../src/mod.js").UuidString | object | null} [options.getAssetUuidOrEmbeddedAssetDataFromLiveAssetImpl]
 */
export function createMockDependencies({
	getAssetUuidFromLiveAssetImpl = () => null,
	getAssetUuidOrEmbeddedAssetDataFromLiveAssetImpl = () => null,
} = {}) {
	const editor = /** @type {import("../../../../../../editor/src/Editor.js").Editor} */ ({});

	const projectAsset = /** @type {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAsset<any>} */ ({});

	const assetManager = /** @type {import("../../../../../../editor/src/assets/AssetManager.js").AssetManager} */ ({
		getAssetUuidFromLiveAsset(liveAsset) {
			return getAssetUuidFromLiveAssetImpl(liveAsset);
		},
		getAssetUuidOrEmbeddedAssetDataFromLiveAsset(liveAsset) {
			return getAssetUuidOrEmbeddedAssetDataFromLiveAssetImpl(liveAsset);
		},
	});

	const assetTypeManager = /** @type {import("../../../../../../editor/src/assets/ProjectAssetTypeManager.js").ProjectAssetTypeManager} */ ({});

	const projectAssetTypeArgs = /** @type {const} */ ([
		editor,
		projectAsset,
		assetManager,
		assetTypeManager,
	]);

	return {
		editor,
		projectAsset,
		assetManager,
		assetTypeManager,
		projectAssetTypeArgs,
	};
}
