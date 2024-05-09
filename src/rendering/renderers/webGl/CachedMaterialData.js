import { WebGlMaterialMapType } from "./WebGlMaterialMapType.js";

export class CachedMaterialData {
	#material;
	/** @type {import("./WebGlMaterialConfig.js").WebGlMaterialConfig?} */
	#materialConfig = null;

	/**
	 * @param {import("../../Material.js").Material} material
	 */
	constructor(material) {
		this.#material = material;
	}

	getMaterialConfig() {
		if (this.#materialConfig) return this.#materialConfig;

		if (!this.#material.materialMap) return null;
		const webGlMap = this.#material.materialMap.getMapTypeInstance(WebGlMaterialMapType);
		if (!webGlMap) return null;
		const config = webGlMap.materialConfig;

		this.#materialConfig = config;
		return config;
	}
}
