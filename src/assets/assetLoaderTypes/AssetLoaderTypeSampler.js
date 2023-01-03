import {AssetLoaderTypeGenericStructure} from "./AssetLoaderTypeGenericStructure.js";
import {Sampler} from "../../rendering/Sampler.js";

export const addressModeTypes = ["clamp-to-edge", "repeat", "mirror-repeat"];
export const filterModeTypes = ["nearest", "linear"];

const binarySerializationOpts = {
	structure: {
		addressModeU: addressModeTypes,
		addressModeV: addressModeTypes,
		addressModeW: addressModeTypes,
		magFilter: filterModeTypes,
		minFilter: filterModeTypes,
		mipmapFilter: filterModeTypes,
	},
	nameIds: {
		addressModeU: 1,
		addressModeV: 2,
		addressModeW: 3,
		magFilter: 4,
		minFilter: 5,
		mipmapFilter: 6,
	},
};

/**
 * @extends {AssetLoaderTypeGenericStructure<typeof binarySerializationOpts>}
 */
export class AssetLoaderTypeSampler extends AssetLoaderTypeGenericStructure {
	static get typeUuid() {
		return "3e526f40-1b56-4b23-814e-13fcf75617c3";
	}

	static get binarySerializationOpts() {
		return binarySerializationOpts;
	}

	/**
	 * @override
	 * @param {ArrayBuffer} buffer
	 */
	async parseBuffer(buffer) {
		const data = await this.getBufferData(buffer);
		const castData = /** @type {GPUSamplerDescriptor} */ (data);
		return new Sampler(castData);
	}
}
