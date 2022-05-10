import {Sampler} from "../../../../src/rendering/Sampler.js";
import {ProjectAssetType} from "./ProjectAssetType.js";

const addressModeTypes = ["clamp-to-edge", "repeat", "mirror-repeat"];
const filterModeTypes = ["nearest", "linear"];

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
export class SamplerProjectAssetType extends ProjectAssetType {
	static type = "JJ:sampler";
	static typeUuid = "3e526f40-1b56-4b23-814e-13fcf75617c3";
	static newFileName = "New Sampler";

	/** @type {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure} */
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
				defaultValue: "nearest",
			},
		},
		minFilter: {
			type: "dropdown",
			guiOpts: {
				items: filterModeTypes,
				defaultValue: "nearest",
			},
		},
		mipmapFilter: {
			type: "dropdown",
			guiOpts: {
				items: filterModeTypes,
				defaultValue: "nearest",
			},
		},
		lodMinClamp: {
			type: "number",
		},
		lodMaxClamp: {
			type: "number",
		},
	};

	static expectedLiveAssetConstructor = Sampler;

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
			editorData: null,
		};
	}
}
