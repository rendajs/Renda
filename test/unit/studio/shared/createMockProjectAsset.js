/**
 * @param {object} options
 * @param {import("../../../../src/mod.js").UuidString} [options.uuid]
 * @param {unknown} [options.liveAsset]
 * @param {boolean} [options.allowImmediateLiveAssetReturn]
 * @param {unknown} [options.readAssetDataReturnValue]
 * @param {unknown} [options.projectAssetTypeConstructor]
 */
export function createMockProjectAsset({
	uuid = "default mock project asset uuid",
	liveAsset = null,
	allowImmediateLiveAssetReturn = true,
	readAssetDataReturnValue = null,
	projectAssetTypeConstructor = null,
} = {}) {
	/** @type {Set<() => void>} */
	const liveAssetReturnCbs = new Set();

	let saveLiveAssetDataCallCount = 0;

	/** @type {Map<string, object>} */
	const previousEmbeddedLiveAssets = new Map();

	const projectAsset = /** @type {import("../../../../studio/src/assets/ProjectAsset.js").ProjectAssetAny} */ ({
		uuid,
		async waitForInit() {},
		async getLiveAsset() {
			if (!allowImmediateLiveAssetReturn) {
				/** @type {Promise<void>} */
				const promise = new Promise(r => liveAssetReturnCbs.add(r));
				await promise;
			}
			return liveAsset;
		},
		async getLiveAssetData() {
			if (!allowImmediateLiveAssetReturn) {
				/** @type {Promise<void>} */
				const promise = new Promise(r => liveAssetReturnCbs.add(r));
				await promise;
			}
			return {liveAsset, studioData: null};
		},
		async saveLiveAssetData() {
			saveLiveAssetDataCallCount++;
		},
		async childEmbeddedAssetNeedsSave() {},
		async readAssetData() {
			return structuredClone(readAssetDataReturnValue);
		},
		async writeAssetData(fileData) {},
		addEmbeddedChildLiveAsset(key, liveAsset) {
			previousEmbeddedLiveAssets.set(key, liveAsset);
		},
		getPreviousEmbeddedLiveAsset(key) {
			return previousEmbeddedLiveAssets.get(key) ?? null;
		},
		onLiveAssetNeedsReplacement(cb) {},
		async getProjectAssetType() {},
		async getIsDeleted() {
			return false;
		},
		registerRecursionTrackerLiveAssetChange(assetManager, assetUuid, cb) {},
		get projectAssetTypeConstructorSync() {
			return projectAssetTypeConstructor;
		},
		async getProjectAssetTypeConstructor() {
			return projectAssetTypeConstructor;
		},
		assertIsAssetTypeSync(projectAssetTypeConstructor) {},
	});
	return {
		projectAsset,
		triggerLiveAssetReturns() {
			liveAssetReturnCbs.forEach(cb => cb());
			liveAssetReturnCbs.clear();
		},
		getSaveLiveAssetDataCallCount() {
			return saveLiveAssetDataCallCount;
		},
	};
}
