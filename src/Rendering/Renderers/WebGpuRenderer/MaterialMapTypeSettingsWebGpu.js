import {MaterialMapTypeSettings} from "../../MaterialMapTypeSettings.js";
import {WebGpuPipelineConfig} from "./WebGpuPipelineConfig.js";

export class MaterialMapTypeSettingsWebGpu extends MaterialMapTypeSettings {
	/**
	 * @param {Object} options
	 * @param {WebGpuPipelineConfig} [options.forwardPipelineConfig]
	 */
	constructor({
		forwardPipelineConfig = null,
	} = {}) {
		super();

		this.forwardPipelineConfig = forwardPipelineConfig;
	}
}
