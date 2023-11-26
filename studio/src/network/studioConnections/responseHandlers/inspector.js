/**
 * @param {import("../../../assets/AssetManager.js").AssetManager} assetManager
 */
export function createInspectorHandlers(assetManager) {
	return {
		/**
		 * @param {import("../../../../../src/mod.js").UuidString} uuid
		 */
		"assets.hasAsset": uuid => {
			const projectAsset = assetManager.getProjectAssetFromUuid(uuid);
			return Boolean(projectAsset);
		},
	};
}
