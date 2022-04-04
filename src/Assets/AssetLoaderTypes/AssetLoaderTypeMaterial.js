import {AssetLoaderType} from "./AssetLoaderType.js";
import {StorageType, binaryToObjectWithAssetLoader} from "../../util/binarySerialization.js";
import {Material} from "../../rendering/Material.js";

export class AssetLoaderTypeMaterial extends AssetLoaderType {
	static get typeUuid() {
		return "430f47a8-82cc-4b4c-a664-2360794e80d6";
	}

	async parseBuffer(buffer) {
		const materialData = await binaryToObjectWithAssetLoader(buffer, this.assetLoader, {
			structure: {
				map: StorageType.ASSET_UUID,
				values: [StorageType.INT8],
			},
			nameIds: {
				map: 1,
				values: 2,
			},
		});
		return new Material(materialData.map);
	}
}
