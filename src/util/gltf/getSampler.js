import {Sampler} from "../../rendering/Sampler.js";

export const NEAREST = 9728;
export const LINEAR = 9729;
export const NEAREST_MIPMAP_NEAREST = 9984;
export const LINEAR_MIPMAP_NEAREST = 9985;
export const NEAREST_MIPMAP_LINEAR = 9986;
export const LINEAR_MIPMAP_LINEAR = 9987;

export const CLAMP_TO_EDGE = 33071;
export const MIRRORED_REPEAT = 33648;
export const REPEAT = 10497;

/** @typedef {(samplerId: number | undefined) => Promise<Sampler>} GetSamplerFn */

/**
 * @typedef GetSamplerHelperOptions
 * @property {Sampler?} defaultSampler
 */

/**
 * Helper function for getting glTF samplers.
 *
 * @param {import("./types.ts").GltfJsonData} jsonData
 * @param {number | undefined} samplerId The index of the image to get from the jsonData.
 * @param {Map<number, Sampler>} samplersCache
 * @param {GetSamplerHelperOptions} options
 */
export async function getSamplerHelper(jsonData, samplerId, samplersCache, {
	defaultSampler,
}) {
	if (samplerId == undefined) {
		if (defaultSampler == undefined) {
			throw new Error("A texture without a sampler was referenced and no default sampler has been provided.");
		}
		return defaultSampler;
	}

	let sampler = samplersCache.get(samplerId);
	if (!sampler) {
		const samplerDatas = jsonData.samplers || [];
		const samplerData = samplerDatas[samplerId];
		if (!samplerData) {
			throw new Error(`Tried to reference sampler with index ${samplerId} but it does not exist.`);
		}

		/** @type {GPUAddressMode} */
		const addressModeU = parseGltfAddressMode(samplerData.wrapS);
		/** @type {GPUAddressMode} */
		const addressModeV = parseGltfAddressMode(samplerData.wrapT);

		/** @type {GPUFilterMode} */
		let magFilter = "linear";
		if (samplerData.magFilter == NEAREST) {
			magFilter = "nearest";
		}

		/** @type {GPUFilterMode} */
		let minFilter = "linear";
		/** @type {GPUFilterMode} */
		let mipmapFilter = "linear";
		if (samplerData.minFilter == NEAREST_MIPMAP_NEAREST) {
			minFilter = "nearest";
			mipmapFilter = "nearest";
		} else if (samplerData.minFilter == LINEAR_MIPMAP_NEAREST) {
			minFilter = "linear";
			mipmapFilter = "nearest";
		} else if (samplerData.minFilter == NEAREST_MIPMAP_LINEAR) {
			minFilter = "nearest";
			mipmapFilter = "linear";
		} else if (samplerData.minFilter == LINEAR_MIPMAP_LINEAR) {
			minFilter = "linear";
			mipmapFilter = "linear";
		}

		sampler = new Sampler({
			addressModeU,
			addressModeV,
			addressModeW: "repeat",
			magFilter,
			minFilter,
			mipmapFilter,
		});
	}

	return sampler;
}

/**
 * @param {number | undefined} addressMode
 * @returns {GPUAddressMode}
 */
function parseGltfAddressMode(addressMode) {
	if (addressMode == CLAMP_TO_EDGE) {
		return "clamp-to-edge";
	} else if (addressMode == MIRRORED_REPEAT) {
		return "mirror-repeat";
	}
	return "repeat";
}
