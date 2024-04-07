import { AssetLoaderTypeSampler, addressModeTypes, filterModeTypes } from "../../../../src/assets/assetLoaderTypes/AssetLoaderTypeSampler.js";
import { Sampler } from "../../../../src/rendering/Sampler.js";
import { ProjectAssetType } from "./ProjectAssetType.js";

/**
 * @typedef SamplerAssetData
 * @property {GPUAddressMode} [addressModeU]
 * @property {GPUAddressMode} [addressModeV]
 * @property {GPUAddressMode} [addressModeW]
 * @property {GPUFilterMode} [magFilter]
 * @property {GPUFilterMode} [minFilter]
 * @property {GPUMipmapFilterMode} [mipmapFilter]
 * @property {number} [lodMinClamp]
 * @property {number} [lodMaxClamp]
 */

/**
 * @extends {ProjectAssetType<Sampler, null, SamplerAssetData>}
 */
export class ProjectAssetTypeSampler extends ProjectAssetType {
	static type = "renda:sampler";
	static typeUuid = "3e526f40-1b56-4b23-814e-13fcf75617c3";
	static newFileName = "New Sampler";
	static uiName = "Sampler";

	/** @type {import("../../ui/propertiesTreeView/types.ts").PropertiesTreeViewStructure} */
	static propertiesAssetContentStructure = {
		addressModeU: {
			type: "dropdown",
			guiOpts: {
				items: addressModeTypes,
				defaultValue: "clamp-to-edge",
			},
		},
		addressModeV: {
			type: "dropdown",
			guiOpts: {
				items: addressModeTypes,
				defaultValue: "clamp-to-edge",
			},
		},
		addressModeW: {
			type: "dropdown",
			guiOpts: {
				items: addressModeTypes,
				defaultValue: "clamp-to-edge",
			},
		},
		magFilter: {
			type: "dropdown",
			guiOpts: {
				items: filterModeTypes,
				defaultValue: "linear",
			},
		},
		minFilter: {
			type: "dropdown",
			guiOpts: {
				items: filterModeTypes,
				defaultValue: "linear",
			},
		},
		mipmapFilter: {
			type: "dropdown",
			guiOpts: {
				items: filterModeTypes,
				defaultValue: "linear",
			},
		},
	};

	static usedAssetLoaderType = AssetLoaderTypeSampler;
	static expectedLiveAssetConstructor = Sampler;
	/** @type {import("../../tasks/task/TaskGenerateServices.js").AssetLoaderTypeImportConfig} */
	static assetLoaderTypeImportConfig = {
		identifier: "AssetLoaderTypeSampler",
	};

	/**
	 * @override
	 * @param {SamplerAssetData?} fileData
	 * @param {import("../liveAssetDataRecursionTracker/RecursionTracker.js").RecursionTracker} recursionTracker
	 * @returns {Promise<import("./ProjectAssetType.js").LiveAssetData<Sampler, null>>}
	 */
	async getLiveAssetData(fileData, recursionTracker) {
		const sampler = new Sampler(fileData || {});
		return {
			liveAsset: sampler,
			studioData: null,
		};
	}
}
