import { MaterialMapType } from "../../MaterialMapType.js";

export class WebGpuMaterialMapType extends MaterialMapType {
	/**
	 * @param {object} options
	 * @param {import("./WebGpuPipelineConfig.js").WebGpuPipelineConfig?} [options.forwardPipelineConfig]
	 */
	constructor({
		forwardPipelineConfig = null,
	} = {}) {
		super();

		this.forwardPipelineConfig = forwardPipelineConfig;
	}
}
