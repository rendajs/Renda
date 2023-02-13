import {assertEquals, assertRejects} from "std/testing/asserts.ts";
import {MaterialMapTypeSerializer} from "../../../../../../studio/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js";
import {MaterialMapType} from "../../../../../../src/rendering/MaterialMapType.js";

const mockContext = /** @type {import("../../../../../../studio/src/assets/materialMapTypeSerializers/MaterialMapTypeSerializer.js").MaterialMapLiveAssetDataContext} */ ({});

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
