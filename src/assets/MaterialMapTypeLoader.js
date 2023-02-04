/**
 * Base class for MaterialMapType loaders.
 * Register the constructor with AssetLoaderTypeMaterialMap.registerMaterialMapTypeLoader()
 * to add support for loading MaterialMapTypes.
 */
export class MaterialMapTypeLoader {
	// this should return the same uuid as the typeUuid of your MaterialMapType
	static get typeUuid() {
		return "";
	}

	/**
	 * @param {import("./AssetLoader.js").AssetLoader} assetLoader
	 * @param {import("./assetLoaderTypes/AssetLoaderTypeMaterialMap.js").AssetLoaderTypeMaterialMap} materialLoader
	 */
	constructor(assetLoader, materialLoader) {
		this.assetLoader = assetLoader;
		this.materialLoader = materialLoader;
	}

	/**
	 * @param {ArrayBuffer} buffer
	 * @returns {Promise<import("../rendering/MaterialMapType.js").MaterialMapType?>}
	 */
	async parseBuffer(buffer) {
		return null;
	}
}
