/**
 * @param {Object} options
 * @param {unknown} [options.liveAsset]
 * @param {boolean} [options.allowImmediateLiveAssetReturn]
 */
export function createMockProjectAsset({
	liveAsset = null,
	allowImmediateLiveAssetReturn = true,
} = {}) {
	/** @type {Set<() => void>} */
	const liveAssetReturnCbs = new Set();

	let saveLiveAssetDataCallCount = 0;

	const projectAsset = /** @type {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAssetAny} */ ({
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
			return {liveAsset, editorData: null};
		},
		async saveLiveAssetData() {
			saveLiveAssetDataCallCount++;
		},
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
