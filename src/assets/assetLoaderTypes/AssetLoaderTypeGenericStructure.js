import {AssetLoaderType} from "./AssetLoaderType.js";
import {binaryToObject, binaryToObjectWithAssetLoader} from "../../util/binarySerialization.js";

/**
 * @template {import("../../util/binarySerialization.js").ObjectToBinaryOptions<any>} TSerializationOptions
 * @template TReturnType
 * @template [TAssetOpts = undefined]
 * @extends {AssetLoaderType<TReturnType, TAssetOpts>}
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
	 */
	async getBufferData(buffer, {
		loadRecursiveAssetUuids = true,
	} = {}) {
		const castConstructor = /** @type {typeof AssetLoaderTypeGenericStructure} */ (this.constructor);
		const composerOpts = castConstructor.binarySerializationOpts;
		if (!composerOpts) {
			throw new Error(`Tried to parse buffer for ${this.constructor.name} without a configured binarySerializationOpts value.`);
		}
		let result;
		if (loadRecursiveAssetUuids) {
			result = await binaryToObjectWithAssetLoader(buffer, this.assetLoader, composerOpts);
		} else {
			result = binaryToObject(buffer, composerOpts);
		}
		return /** @type {import("../../util/binarySerializationTypes.ts").StructureToObjectWithMaybeAssetLoader<TSerializationOptions["structure"]>} */ (result);
	}
}
