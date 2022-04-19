import {assertEquals, assertRejects} from "asserts";
import {MaterialMapTypeSerializer} from "../../../../../../../../editor/src/assets/projectAssetType/projectAssetTypeMaterialMap/materialMapTypeSerializers/MaterialMapTypeSerializer.js";
import {MaterialMapType} from "../../../../../../../../src/rendering/MaterialMapType.js";

const mockContext = /** @type {import("../../../../../../../../editor/src/assets/projectAssetType/projectAssetTypeMaterialMap/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapLiveAssetDataContext} */ ({});

Deno.test({
	name: "saveLiveAssetData() rejects when not implemented",
	async fn() {
		class ExtendedMaterialMapTypeSerializer extends MaterialMapTypeSerializer {}

		await assertRejects(async () => {
			await ExtendedMaterialMapTypeSerializer.saveLiveAssetData(mockContext, new MaterialMapType());
		}, Error, `"ExtendedMaterialMapTypeSerializer" hasn't implemented saveLiveAssetData().`);
	},
});

Deno.test({
	name: "loadLiveAssetData() returns null by default",
	async fn() {
		class ExtendedMaterialMapTypeSerializer extends MaterialMapTypeSerializer {}

		const result = await ExtendedMaterialMapTypeSerializer.loadLiveAssetData(mockContext, null);
		assertEquals(result, null);
	},
});
