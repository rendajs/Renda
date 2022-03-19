/**
 * @typedef MockProjectAssetTypeDiskData
 * @property {number} num
 * @property {string} str
 */

/**
 * @typedef MockProjectAssetTypeEditorData
 * @property {number} editorNum
 * @property {string} editorStr
 */

/** @typedef {import("../../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetType<MockProjectAssetTypeLiveAsset, MockProjectAssetTypeEditorData, MockProjectAssetTypeDiskData>} MockProjectAssetType */

class MockProjectAssetTypeLiveAsset {
	constructor() {
		this.num = 0;
		this.str = "";
	}
}

/**
 * @param {import("../../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeIdentifier} type
 */
export function createMockProjectAssetType(type) {
	class ProjectAssetType {
		static type = type;
		static typeUuid = "00000000-0000-0000-0000-000000000000";
		static storeInProjectAsJson = true;
		static wrapProjectJsonWithEditorMetaData = true;

		/**
		 * @param {MockProjectAssetTypeDiskData?} fileData
		 * @param {import("../../../../../../editor/src/assets/liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
		 * @returns {Promise<import("../../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").LiveAssetData<MockProjectAssetTypeLiveAsset, MockProjectAssetTypeEditorData>>}
		 */
		async getLiveAssetData(fileData, recursionTracker) {
			if (!fileData) return {};

			const liveAsset = new MockProjectAssetTypeLiveAsset();
			liveAsset.num = fileData.num;
			liveAsset.str = fileData.str;
			return {
				liveAsset,
				editorData: {
					editorNum: 42,
					editorStr: "defaultMockLiveAssetEditorStr",
				},
			};
		}

		destroyLiveAssetData() {}
	}

	const castUnknown = /** @type {unknown} */ (ProjectAssetType);
	const castProjectAssetType = /** @type {MockProjectAssetType} */ (castUnknown);

	return {
		MockProjectAssetTypeLiveAsset,
		MockProjectAssetType: ProjectAssetType,
		ProjectAssetType: castProjectAssetType,
	};
}
