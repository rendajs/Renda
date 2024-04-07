import { AssetLoaderType } from "./AssetLoaderType.js";
import { StorageType, binaryToObjectWithAssetLoader } from "../../util/binarySerialization.js";
import { Material } from "../../rendering/Material.js";
import { MaterialMap } from "../../rendering/MaterialMap.js";

/**
 * @extends {AssetLoaderType<Material>}
 */
export class AssetLoaderTypeMaterial extends AssetLoaderType {
	static get typeUuid() {
		return "430f47a8-82cc-4b4c-a664-2360794e80d6";
	}

	/**
	 * @override
	 * @param {ArrayBuffer} buffer
	 */
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
		if (!(materialData.map instanceof MaterialMap)) {
			throw new Error("Failed to load Material asset, the map uuid is not a MaterialMap");
		}
		return new Material(materialData.map);
	}
}
