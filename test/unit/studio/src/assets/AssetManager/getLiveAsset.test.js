import {assertEquals, assertExists, assertInstanceOf, assertRejects} from "std/testing/asserts.ts";
import {injectMockStudioInstance} from "../../../../../../studio/src/studioInstance.js";
import {BASIC_ASSET_UUID, DEFAULT_BASIC_ASSET_NUM_ON_DISK, DEFAULT_BASIC_ASSET_STR_ON_DISK, NONEXISTENT_ASSET_UUID, basicSetup} from "./shared.js";

injectMockStudioInstance(/** @type {any} */ ({}));

Deno.test({
	name: "getLiveAsset()",
	async fn() {
		const {assetManager, MockProjectAssetTypeLiveAsset} = await basicSetup();

		const liveAsset = await assetManager.getLiveAsset(BASIC_ASSET_UUID);

		assertExists(liveAsset);
		assertInstanceOf(liveAsset, MockProjectAssetTypeLiveAsset);
		assertEquals(liveAsset.num, DEFAULT_BASIC_ASSET_NUM_ON_DISK);
		assertEquals(liveAsset.str, DEFAULT_BASIC_ASSET_STR_ON_DISK);
	},
});

Deno.test({
	name: "getLiveAsset() non existent",
	async fn() {
		const {assetManager} = await basicSetup();

		const liveAsset = await assetManager.getLiveAsset(NONEXISTENT_ASSET_UUID);

		assertEquals(liveAsset, null);
	},
});

Deno.test({
	name: "getLiveAsset() non existent, assertExists true",
	async fn() {
		const {assetManager} = await basicSetup();

		await assertRejects(async () => {
			await assetManager.getLiveAsset(NONEXISTENT_ASSET_UUID, {
				assertExists: true,
			});
		}, Error, `Failed to get project asset, no asset with uuid "${NONEXISTENT_ASSET_UUID}" exists.`);
	},
});
