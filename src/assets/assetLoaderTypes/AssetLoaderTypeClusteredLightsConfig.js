import { AssetLoaderTypeGenericStructure } from "./AssetLoaderTypeGenericStructure.js";
import { StorageType } from "../../util/binarySerialization.js";
import { ClusteredLightsConfig } from "../../rendering/ClusteredLightsConfig.js";

const binarySerializationOpts = {
	structure: {
		clusterCount: [StorageType.UINT32],
		maxLightsPerClusterPass: StorageType.UINT32,
	},
	nameIds: {
		clusterCount: 1,
		maxLightsPerClusterPass: 2,
	},
};

/**
 * @extends {AssetLoaderTypeGenericStructure<typeof binarySerializationOpts, ClusteredLightsConfig>}
 */
export class AssetLoaderTypeClusteredLightsConfig extends AssetLoaderTypeGenericStructure {
	static get typeUuid() {
		return "13194e5c-01e8-4ecc-b645-86626b9d5e4c";
	}

	static get binarySerializationOpts() {
		return binarySerializationOpts;
	}

	/**
	 * @override
	 * @param {ArrayBuffer} buffer
	 */
	async parseBuffer(buffer) {
		const data = await this.getBufferData(buffer);
		return new ClusteredLightsConfig(data);
	}
}
