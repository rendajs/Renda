export function createMockDependencies() {
	const editor = /** @type {import("../../../../../../editor/src/Editor.js").Editor} */ ({});
	const projectAsset = /** @type {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAsset<any>} */ ({});
	const assetManager = /** @type {import("../../../../../../editor/src/assets/AssetManager.js").AssetManager} */ ({});
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
