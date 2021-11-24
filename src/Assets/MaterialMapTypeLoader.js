import {MaterialMapTypeSettings} from "../Rendering/MaterialMapTypeSettings.js";

export default class MaterialMapTypeLoader {
	// this should return the same uuid as the typeUuid of your MaterialMapType
	static get typeUuid() {
		return null;
	}

	constructor(assetLoader, materialLoader) {
		this.assetLoader = assetLoader;
		this.materialLoader = materialLoader;
	}

	/**
	 * @param {ArrayBuffer} buffer
	 * @returns {Promise<MaterialMapTypeSettings>}
	 */
	async parseBuffer(buffer) {
		return null;
	}

	static invalidConfigurationWarning(message) {
		console.warn(message + "\nView MaterialMapTypeLoader.js for more info.");
	}
}
