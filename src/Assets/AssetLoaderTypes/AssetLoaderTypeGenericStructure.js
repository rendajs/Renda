import AssetLoaderType from "./AssetLoaderType.js";
import BinaryComposer from "../../Util/BinaryComposer.js";

export default class AssetLoaderTypeGenericStructure extends AssetLoaderType {
	static get binaryComposerOpts() {
		return null;
	}

	async parseBuffer(buffer, {
		loadRecursiveAssetUuids = true,
	} = {}) {
		const castConstructor = /** @type {typeof AssetLoaderTypeGenericStructure} */ (this.constructor);
		if (loadRecursiveAssetUuids) {
			return await BinaryComposer.binaryToObjectWithAssetLoader(buffer, this.assetLoader, castConstructor.binaryComposerOpts);
		} else {
			return BinaryComposer.binaryToObject(buffer, castConstructor.binaryComposerOpts);
		}
	}
}
