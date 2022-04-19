import {AssetLoaderType} from "./AssetLoaderType.js";
import {binaryToObject, binaryToObjectWithAssetLoader} from "../../util/binarySerialization.js";

/**
 * @template {import("../../util/binarySerialization.js").ObjectToBinaryOptions<any>} TSerializationOptions
 */
export class AssetLoaderTypeGenericStructure extends AssetLoaderType {
	/**
	 * @returns {import("../../util/binarySerialization.js").ObjectToBinaryOptions<any>?}
	 */
	static get binarySerializationOpts() {
		return null;
	}

	/**
	 * @param {ArrayBuffer} buffer
	 * @returns {Promise<import("../../util/binarySerializationTypes.js").StructureToObjectWithMaybeAssetLoader<TSerializationOptions["structure"]>>}
	 */
	async getBufferData(buffer, {
		loadRecursiveAssetUuids = true,
	} = {}) {
		const castConstructor = /** @type {typeof AssetLoaderTypeGenericStructure} */ (this.constructor);
		const composerOpts = castConstructor.binarySerializationOpts;
		if (!composerOpts) {
			throw new Error(`Tried to parse buffer for ${this.constructor.name} without a configured binarySerializationOpts value.`);
		}
		if (loadRecursiveAssetUuids) {
			return await binaryToObjectWithAssetLoader(buffer, this.assetLoader, composerOpts);
		} else {
			return binaryToObject(buffer, composerOpts);
		}
	}
}
