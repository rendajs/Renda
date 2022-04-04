import {AssetLoaderType} from "./AssetLoaderType.js";
import {binaryToObject, binaryToObjectWithAssetLoader} from "../../util/binarySerialization.js";

export class AssetLoaderTypeGenericStructure extends AssetLoaderType {
	/**
	 * @returns {import("../../util/binarySerialization.js").BinaryComposerObjectToBinaryOptions?}
	 */
	static get binaryComposerOpts() {
		return null;
	}

	/**
	 * @override
	 * @param {ArrayBuffer} buffer
	 */
	async parseBuffer(buffer, {
		loadRecursiveAssetUuids = true,
	} = {}) {
		const castConstructor = /** @type {typeof AssetLoaderTypeGenericStructure} */ (this.constructor);
		if (loadRecursiveAssetUuids) {
			return await binaryToObjectWithAssetLoader(buffer, this.assetLoader, castConstructor.binaryComposerOpts);
		} else {
			return binaryToObject(buffer, castConstructor.binaryComposerOpts);
		}
	}
}
