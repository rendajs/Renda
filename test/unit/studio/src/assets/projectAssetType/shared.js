/**
 * @param {object} options
 * @param {import("../../../../../../studio/src/assets/AssetManager.js").AssetManager["getAssetUuidFromLiveAsset"]} [options.getAssetUuidFromLiveAssetImpl]
 * @param {import("../../../../../../studio/src/assets/AssetManager.js").AssetManager["getAssetUuidOrEmbeddedAssetDataFromLiveAsset"]} [options.getAssetUuidOrEmbeddedAssetDataFromLiveAssetImpl]
 * @param {import("../../../../../../studio/src/assets/AssetManager.js").AssetManager["getProjectAssetFromUuidOrEmbeddedAssetData"]} [options.getProjectAssetFromUuidOrEmbeddedAssetDataImpl]
 */
export function createMockDependencies({
	getAssetUuidFromLiveAssetImpl = () => null,
	getAssetUuidOrEmbeddedAssetDataFromLiveAssetImpl = () => null,
	getProjectAssetFromUuidOrEmbeddedAssetDataImpl = () => {
		throw new Error("getProjectAssetFromUuidOrEmbeddedAssetData not implemented");
	},
} = {}) {
	const studio = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({});

	const projectAsset = /** @type {import("../../../../../../studio/src/assets/ProjectAsset.js").ProjectAsset<any>} */ ({});

	const assetManager = /** @type {import("../../../../../../studio/src/assets/AssetManager.js").AssetManager} */ ({
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

	const assetTypeManager = /** @type {import("../../../../../../studio/src/assets/ProjectAssetTypeManager.js").ProjectAssetTypeManager} */ ({});

	const projectAssetTypeArgs = /** @type {const} */ ([
		studio,
		projectAsset,
		assetManager,
		assetTypeManager,
	]);

	return {
		studio,
		projectAsset,
		assetManager,
		assetTypeManager,
		projectAssetTypeArgs,
	};
}

export function getMockRecursionTracker() {
	return /** @type {import("../../../../../../studio/src/assets/liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} */ ({

	});
}
