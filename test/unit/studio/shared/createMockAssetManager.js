export function createMockAssetManager() {
	const assetManager = /** @type {import("../../../../studio/src/assets/AssetManager.js").AssetManager} */ ({
		getProjectAssetFromUuidSync(uuid) {},
	});

	return { assetManager };
}
