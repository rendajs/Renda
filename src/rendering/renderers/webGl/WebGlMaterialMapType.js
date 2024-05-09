import { MaterialMapType } from "../../MaterialMapType.js";

export class WebGlMaterialMapType extends MaterialMapType {
	/**
	 * @param {object} options
	 * @param {import("./WebGlMaterialConfig.js").WebGlMaterialConfig?} [options.materialConfig]
	 */
	constructor({
		materialConfig = null,
	} = {}) {
		super();

		this.materialConfig = materialConfig;
	}
}
