/**
 * @param {Object} options
 * @param {import("../../../../../../editor/src/assets/AssetManager.js").AssetManager["getAssetUuidFromLiveAsset"]} [options.getAssetUuidFromLiveAssetImpl]
 * @param {import("../../../../../../editor/src/assets/AssetManager.js").AssetManager["getAssetUuidOrEmbeddedAssetDataFromLiveAsset"]} [options.getAssetUuidOrEmbeddedAssetDataFromLiveAssetImpl]
 * @param {import("../../../../../../editor/src/assets/AssetManager.js").AssetManager["getProjectAssetFromUuidOrEmbeddedAssetData"]} [options.getProjectAssetFromUuidOrEmbeddedAssetDataImpl]
 */
export function createMockDependencies({
	getAssetUuidFromLiveAssetImpl = () => null,
	getAssetUuidOrEmbeddedAssetDataFromLiveAssetImpl = () => null,
	getProjectAssetFromUuidOrEmbeddedAssetDataImpl = () => {
		throw new Error("getProjectAssetFromUuidOrEmbeddedAssetData not implemented");
	},
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
		getProjectAssetFromUuidOrEmbeddedAssetData(uuidOrData, options) {
			return getProjectAssetFromUuidOrEmbeddedAssetDataImpl(uuidOrData, options);
		},
		getLiveAsset(uuid, assertionOptions) {},
		async getProjectAssetFromUuid(uuid, options) {
			return null;
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

export function getMockRecursionTracker() {
	return /** @type {import("../../../../../../editor/src/assets/liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} */ ({

	});
}
