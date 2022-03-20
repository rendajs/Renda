/**
 * @param {Object} options
 * @param {string} options.BASIC_ASSET_EXTENSION The file extension for which to return the ProjectAssetType
 * @param {string} options.BASIC_PROJECTASSETTYPE The asset type for which to return the ProjectAssetType
 * @param {typeof import("../../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetType} options.ProjectAssetType The ProjectAssetType to return.
 */
export function createMockProjectAssetTypeManager({
	BASIC_ASSET_EXTENSION,
	BASIC_PROJECTASSETTYPE,
	ProjectAssetType,
}) {
	const mockProjectAssetTypeManager = /** @type {import("../../../../../../editor/src/assets/ProjectAssetTypeManager.js").ProjectAssetTypeManager} */ ({
		*getAssetTypesForExtension(extension) {
			if (extension == BASIC_ASSET_EXTENSION) {
				yield ProjectAssetType;
			}
		},
		getAssetType(type) {
			if (type == BASIC_PROJECTASSETTYPE) {
				return ProjectAssetType;
			}
			return null;
		},
	});
	return mockProjectAssetTypeManager;
}
