/**
 * @param {import("../../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeIdentifier} type
 */
export function createMockProjectAssetType(type) {
	class ProjectAssetType {
		static type = type;
	}

	const castUnknown = /** @type {unknown} */ (ProjectAssetType);
	const castProjectAssetType = /** @type {import("../../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} */ (castUnknown);

	return {
		MockProjectAssetType: ProjectAssetType,
		ProjectAssetType: castProjectAssetType,
	};
}
