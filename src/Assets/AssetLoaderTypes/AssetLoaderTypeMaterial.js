import {AssetLoaderType} from "./AssetLoaderType.js";
import BinaryComposer, {StorageType} from "../../util/BinaryComposer.js";
import {Material} from "../../Rendering/Material.js";

export class AssetLoaderTypeMaterial extends AssetLoaderType {
	static get typeUuid() {
		return "430f47a8-82cc-4b4c-a664-2360794e80d6";
	}

	async parseBuffer(buffer) {
		const materialData = await BinaryComposer.binaryToObjectWithAssetLoader(buffer, this.assetLoader, {
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
