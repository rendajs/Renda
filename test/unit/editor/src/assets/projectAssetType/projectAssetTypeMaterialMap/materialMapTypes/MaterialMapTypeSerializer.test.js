import {assertEquals, assertRejects} from "asserts";
import {MaterialMapTypeSerializer} from "../../../../../../../../editor/src/assets/projectAssetType/projectAssetTypeMaterialMap/materialMapTypes/MaterialMapTypeSerializer.js";

const mockEditor = /** @type {any} */ ({});
const mockAssetManager = /** @type {any} */ ({});

Deno.test({
	name: "saveLiveAssetData() rejects when not implemented",
	async fn() {
		class ExtendedMaterialMapTypeSerializer extends MaterialMapTypeSerializer {}

		await assertRejects(async () => {
			await ExtendedMaterialMapTypeSerializer.saveLiveAssetData(mockEditor, mockAssetManager, null);
		}, Error, `"ExtendedMaterialMapTypeSerializer" hasn't implemented saveLiveAssetData().`);
	},
});

Deno.test({
	name: "loadLiveAssetData() returns null by default",
	async fn() {
		class ExtendedMaterialMapTypeSerializer extends MaterialMapTypeSerializer {}

		const result = await ExtendedMaterialMapTypeSerializer.loadLiveAssetData(mockEditor, mockAssetManager, null);
		assertEquals(result, null);
	},
});
