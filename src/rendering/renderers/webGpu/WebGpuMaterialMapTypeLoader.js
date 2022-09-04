import {StorageType, binaryToObjectWithAssetLoader} from "../../../util/binarySerialization.js";
import {MaterialMapTypeLoader} from "../../../assets/MaterialMapTypeLoader.js";
import {WebGpuMaterialMapType} from "./WebGpuMaterialMapType.js";
import {WebGpuPipelineConfig} from "./WebGpuPipelineConfig.js";

/**
 * @typedef {object} WebGpuMaterialMap
 * @property {import("./WebGpuPipelineConfig.js").WebGpuPipelineConfig} forwardPipelineConfig
 */

export class WebGpuMaterialMapTypeLoader extends MaterialMapTypeLoader {
	static get typeUuid() {
		return "286eaa41-36ce-4d94-9413-d52fc435b6e5";
	}

	/**
	 * @override
	 * @param {ArrayBuffer} buffer
	 */
	async parseBuffer(buffer) {
		const settings = await binaryToObjectWithAssetLoader(buffer, this.assetLoader, {
			structure: {
				forwardPipelineConfig: StorageType.ASSET_UUID,
			},
			nameIds: {
				forwardPipelineConfig: 1,
			},
		});
		const pipelineConfig = settings.forwardPipelineConfig;
		if (pipelineConfig != null && !(pipelineConfig instanceof WebGpuPipelineConfig)) {
			throw new Error("Failed to load WebGpu material map: forwardPipelineConfig is not a WebGpuPipelineConfig asset uuid.");
		}
		const settings2 = {
			...settings,
			forwardPipelineConfig: pipelineConfig,
		};
		return new WebGpuMaterialMapType(settings2);
	}
}
