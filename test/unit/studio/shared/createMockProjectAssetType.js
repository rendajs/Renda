/**
 * @typedef MockProjectAssetTypeDiskData
 * @property {number} [num]
 * @property {string} [str]
 */

/**
 * @typedef MockProjectAssetTypeStudioData
 * @property {number} studioNum
 * @property {string} studioStr
 */

/** @typedef {import("../../../../studio/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetType<MockProjectAssetTypeLiveAsset, MockProjectAssetTypeStudioData, MockProjectAssetTypeDiskData>} MockProjectAssetType */

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
		static wrapProjectJsonWithStudioMetaData = true;

		/**
		 * @param {import("../../../../studio/src/Studio.js").Studio} studioInstance
		 * @param {import("../../../../studio/src/assets/ProjectAsset.js").ProjectAssetAny} projectAsset
		 */
		constructor(studioInstance, projectAsset) {
			this.studioInstance = studioInstance;
			this.projectAsset = projectAsset;
		}

		/**
		 * @param {MockProjectAssetTypeDiskData?} fileData
		 * @param {import("../../../../studio/src/assets/liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
		 * @returns {Promise<import("../../../../studio/src/assets/projectAssetType/ProjectAssetType.js").LiveAssetData<MockProjectAssetTypeLiveAsset, MockProjectAssetTypeStudioData>>}
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
				studioData: {
					studioNum: 42,
					studioStr: "defaultMockLiveAssetStudioStr",
				},
			};
		}

		/**
		 * @param {unknown} liveAsset
		 * @param {unknown} studioData
		 */
		saveLiveAssetData(liveAsset, studioData) {}

		createNewLiveAssetData() {
			return {
				liveAsset: null,
				studioData: null,
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
