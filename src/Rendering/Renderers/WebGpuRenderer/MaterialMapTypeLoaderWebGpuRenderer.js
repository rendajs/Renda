import BinaryComposer, {StorageType} from "../../../util/BinaryComposer.js";
import {MaterialMapTypeLoader} from "../../../Assets/MaterialMapTypeLoader.js";
import {MaterialMapTypeWebGpu} from "./MaterialMapTypeWebGpu.js";

/**
 * @typedef {Object} WebGpuMaterialMap
 * @property {import("./WebGpuPipelineConfig.js").WebGpuPipelineConfig} forwardPipelineConfig
 */

export class MaterialMapTypeLoaderWebGpuRenderer extends MaterialMapTypeLoader {
	static get typeUuid() {
		return "286eaa41-36ce-4d94-9413-d52fc435b6e5";
	}

	/**
	 * @override
	 */
	async parseBuffer(buffer) {
		const settings = await BinaryComposer.binaryToObjectWithAssetLoader(buffer, this.assetLoader, {
			structure: {
				forwardPipelineConfig: StorageType.ASSET_UUID,
			},
			nameIds: {
				forwardPipelineConfig: 1,
			},
		});
		return new MaterialMapTypeWebGpu(settings);
	}
}
