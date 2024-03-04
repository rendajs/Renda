import { assertEquals, assertInstanceOf } from "std/testing/asserts.ts";
import { injectMockStudioInstance } from "../../../../../../studio/src/studioInstance.js";
import { BASIC_ASSET_UUID, BASIC_PERSISTENCE_KEY, DEFAULT_BASIC_ASSET_NUM_ON_DISK, DEFAULT_BASIC_ASSET_STR_ON_DISK, basicSetup } from "./shared.js";
import { createMockProjectAsset } from "../../../shared/createMockProjectAsset.js";

injectMockStudioInstance(/** @type {any} */ ({}));

Deno.test({
	name: "getLiveAssetFromUuidOrEmbeddedAssetData() with null",
	async fn() {
		const { assetManager, ProjectAssetType } = await basicSetup();
		const { projectAsset: parentAsset } = createMockProjectAsset();
		const result = await assetManager.getLiveAssetFromUuidOrEmbeddedAssetData(null, {
			assertAssetType: ProjectAssetType,
			parentAsset,
			embeddedAssetPersistenceKey: BASIC_PERSISTENCE_KEY,
		});
		assertEquals(result, null);
	},
});

Deno.test({
	name: "getLiveAssetFromUuidOrEmbeddedAssetData() with uuid",
	async fn() {
		const { assetManager, ProjectAssetType, MockProjectAssetTypeLiveAsset } = await basicSetup();
		const { projectAsset: parentAsset } = createMockProjectAsset();
		const liveAsset = await assetManager.getLiveAssetFromUuidOrEmbeddedAssetData(BASIC_ASSET_UUID, {
			assertAssetType: ProjectAssetType,
			parentAsset,
			embeddedAssetPersistenceKey: BASIC_PERSISTENCE_KEY,
		});
		assertInstanceOf(liveAsset, MockProjectAssetTypeLiveAsset);
		assertEquals(liveAsset.num, DEFAULT_BASIC_ASSET_NUM_ON_DISK);
		assertEquals(liveAsset.str, DEFAULT_BASIC_ASSET_STR_ON_DISK);
	},
});

Deno.test({
	name: "getLiveAssetFromUuidOrEmbeddedAssetData() with embedded asset data",
	async fn() {
		const { assetManager, ProjectAssetType, MockProjectAssetTypeLiveAsset } = await basicSetup();
		const { projectAsset: parentAsset } = createMockProjectAsset();
		const liveAsset = await assetManager.getLiveAssetFromUuidOrEmbeddedAssetData({
			num: 123,
			str: "string from passed in object",
		}, {
			assertAssetType: ProjectAssetType,
			parentAsset,
			embeddedAssetPersistenceKey: BASIC_PERSISTENCE_KEY,
		});
		assertInstanceOf(liveAsset, MockProjectAssetTypeLiveAsset);
		assertEquals(liveAsset.num, 123);
		assertEquals(liveAsset.str, "string from passed in object");
	},
});

