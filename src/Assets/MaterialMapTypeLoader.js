/**
 * Base class for MaterialMapType loaders.
 * Register the constructor with AssetLoaderTypeMaterialMap.registerMaterialMapTypeLoader()
 * to add support for loading MaterialMapTypes.
 */
export class MaterialMapTypeLoader {
	// this should return the same uuid as the typeUuid of your MaterialMapType
	static get typeUuid() {
		return null;
	}

	/**
	 *
	 * @param {import("./AssetLoader.js").AssetLoader} assetLoader
	 * @param {import("./AssetLoaderTypes/AssetLoaderTypeMaterialMap.js").AssetLoaderTypeMaterialMap} materialLoader
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

	/**
	 * @param {string} message
	 */
	static invalidConfigurationWarning(message) {
		// TODO: throw an error instead
		console.warn(message + "\nView MaterialMapTypeLoader.js for more info.");
	}
}
