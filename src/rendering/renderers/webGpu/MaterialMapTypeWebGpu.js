import {MaterialMapType} from "../../MaterialMapType.js";
import {WebGpuPipelineConfig} from "./WebGpuPipelineConfig.js";

export class MaterialMapTypeWebGpu extends MaterialMapType {
	/**
	 * @param {Object} options
	 * @param {WebGpuPipelineConfig?} [options.forwardPipelineConfig]
	 */
	constructor({
		forwardPipelineConfig = null,
	} = {}) {
		super();

		this.forwardPipelineConfig = forwardPipelineConfig;
	}
}
