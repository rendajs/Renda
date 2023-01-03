import {assertEquals} from "std/testing/asserts.ts";
import {StorageType, binaryToObjectWithAssetLoader, createObjectToBinaryOptions, objectToBinary} from "../../../../../src/mod.js";

const BASIC_ASSET_UUID = "00000000-0000-0000-0000-000000000001";

function createMockAssetLoader() {
	const assetLoader = /** @type {import("../../../../../src/mod.js").AssetLoader} */ ({
		async getAsset(uuid, options) {
			return {
				loadedAssetUuid: uuid,
			};
		},
	});
	return assetLoader;
}

Deno.test({
	name: "binaryToObjectWithAssetLoader()",
	async fn() {
		const opts = createObjectToBinaryOptions({
			structure: {
				asset: StorageType.ASSET_UUID,
				num: StorageType.UINT32,
				unsetAsset: StorageType.ASSET_UUID,
				unsetNumber: StorageType.UINT32,
			},
			nameIds: {
				asset: 1,
				num: 2,
				unsetAsset: 3,
				unsetNumber: 4,
			},
		});

		const buffer = objectToBinary({
			asset: BASIC_ASSET_UUID,
			num: 42,
		}, opts);

		const assetLoader = createMockAssetLoader();

		const result = await binaryToObjectWithAssetLoader(buffer, assetLoader, opts);
		assertEquals(result, {
			asset: {
				loadedAssetUuid: BASIC_ASSET_UUID,
			},
			num: 42,
			unsetAsset: null,
			unsetNumber: 0,
		});
	},
});
