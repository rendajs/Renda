import BinaryComposer, {StorageType} from "../../../Util/BinaryComposer.js";
import MaterialMapTypeLoader from "../../../Assets/MaterialMapTypeLoader.js";

/**
 * @typedef {Object} WebGpuMaterialMap
 * @property {import("./WebGpuPipelineConfig.js").WebGpuPipelineConfig} forwardPipelineConfig
 */

export class MaterialMapTypeLoaderWebGpuRenderer extends MaterialMapTypeLoader {
	static get typeUuid() {
		return "286eaa41-36ce-4d94-9413-d52fc435b6e5";
	}

	async parseBuffer(buffer) {
		return await BinaryComposer.binaryToObjectWithAssetLoader(buffer, this.assetLoader, {
			structure: {
				forwardPipelineConfig: StorageType.ASSET_UUID,
			},
			nameIds: {
				forwardPipelineConfig: 1,
			},
		});
	}
}
