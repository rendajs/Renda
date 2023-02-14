import {Texture} from "../../../../src/core/Texture.js";
import {ProjectAssetType} from "./ProjectAssetType.js";

/**
 * @typedef ProjectAssetTypeTextureStudioData
 * @property {unknown} [todo]
 */

/**
 * @extends {ProjectAssetType<Texture, ProjectAssetTypeTextureStudioData, any, null>}
 */
export class ProjectAssetTypeTexture extends ProjectAssetType {
	static type = "renda:texture";
	static typeUuid = "7db7d04f-bb6d-4b9e-9390-06f23dd47f4b";
	static matchExtensions = ["png"];
	static storeInProjectAsJson = false;
	static storeInProjectAsText = false;

	/** @type {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure} */
	static assetSettingsStructure = {

	};

	static expectedLiveAssetConstructor = Texture;

	/**
	 * @override
	 * @param {Blob} blob
	 * @param {import("../liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 * @returns {Promise<import("./ProjectAssetType.js").LiveAssetData<Texture, ProjectAssetTypeTextureStudioData>>}
	 */
	async getLiveAssetData(blob, recursionTracker) {
		return {
			liveAsset: new Texture(blob),
			studioData: {},
		};
	}
}
