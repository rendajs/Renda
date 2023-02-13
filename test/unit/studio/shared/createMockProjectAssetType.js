/**
 * @typedef MockProjectAssetTypeDiskData
 * @property {number} [num]
 * @property {string} [str]
 */

/**
 * @typedef MockProjectAssetTypeEditorData
 * @property {number} editorNum
 * @property {string} editorStr
 */

/** @typedef {import("../../../../studio/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetType<MockProjectAssetTypeLiveAsset, MockProjectAssetTypeEditorData, MockProjectAssetTypeDiskData>} MockProjectAssetType */

class MockProjectAssetTypeLiveAsset {
	constructor() {
		this.num = 0;
		this.str = "";
	}
}

/**
 * @param {import("../../../../studio/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeIdentifier} type
 */
export function createMockProjectAssetType(type) {
	class MockProjectAssetType {
		static type = type;
		static typeUuid = "00000000-0000-0000-0000-000000000000";
		static storeInProjectAsJson = true;
		static wrapProjectJsonWithEditorMetaData = true;

		/**
		 * @param {import("../../../../studio/src/Studio.js").Studio} editorInstance
		 * @param {import("../../../../studio/src/assets/ProjectAsset.js").ProjectAssetAny} projectAsset
		 */
		constructor(editorInstance, projectAsset) {
			this.editorInstance = editorInstance;
			this.projectAsset = projectAsset;
		}

		/**
		 * @param {MockProjectAssetTypeDiskData?} fileData
		 * @param {import("../../../../studio/src/assets/liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
		 * @returns {Promise<import("../../../../studio/src/assets/projectAssetType/ProjectAssetType.js").LiveAssetData<MockProjectAssetTypeLiveAsset, MockProjectAssetTypeEditorData>>}
		 */
		async getLiveAssetData(fileData, recursionTracker) {
			if (!fileData) {
				throw new Error("Failed to get live asset data, no file data provided.");
			}

			const liveAsset = new MockProjectAssetTypeLiveAsset();
			liveAsset.num = fileData.num || 0;
			liveAsset.str = fileData.str || "";
			return {
				liveAsset,
				editorData: {
					editorNum: 42,
					editorStr: "defaultMockLiveAssetEditorStr",
				},
			};
		}

		/**
		 * @param {unknown} liveAsset
		 * @param {unknown} editorData
		 */
		saveLiveAssetData(liveAsset, editorData) {}

		createNewLiveAssetData() {
			return {
				liveAsset: null,
				editorData: null,
			};
		}

		destroyLiveAssetData() {}

		async *getReferencedAssetUuids() {}
	}

	const castUnknown = /** @type {unknown} */ (MockProjectAssetType);
	const castProjectAssetType = /** @type {typeof import("../../../../studio/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetType} */ (castUnknown);

	return {
		MockProjectAssetTypeLiveAsset,
		MockProjectAssetType,
		ProjectAssetType: castProjectAssetType,
	};
}
