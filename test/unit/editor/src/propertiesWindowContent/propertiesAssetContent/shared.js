/**
 * @param {Object} options
 * @param {unknown} [options.liveAsset]
 */
export function createMockProjectAsset({
	liveAsset = null,
} = {}) {
	const projectAsset = /** @type {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAssetAny} */ ({
		getLiveAsset() {
			return liveAsset;
		},
	});
	return projectAsset;
}
