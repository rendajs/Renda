import {assertEquals, assertExists, assertRejects} from "asserts";
import {injectMockEditorInstance} from "../../../../../../editor/src/editorInstance.js";
import {BASIC_ASSET_UUID, BASIC_PROJECTASSETTYPE, NONEXISTENT_ASSET_UUID, NONEXISTENT_PROJECTASSETTYPE, basicSetup} from "./shared.js";

injectMockEditorInstance(/** @type {any} */ ({}));

Deno.test({
	name: "getProjectAsset()",
	async fn() {
		const {assetManager} = await basicSetup();

		const asset = await assetManager.getProjectAsset(BASIC_ASSET_UUID);

		assertExists(asset);
	},
});

Deno.test({
	name: "getProjectAsset() non existent",
	async fn() {
		const {assetManager} = await basicSetup();

		const asset = await assetManager.getProjectAsset(NONEXISTENT_ASSET_UUID);

		assertEquals(asset, null);
	},
});

Deno.test({
	name: "getProjectAsset() assert asset type, valid asset type",
	async fn() {
		const {assetManager, ProjectAssetType} = await basicSetup();

		const asset = await assetManager.getProjectAsset(BASIC_ASSET_UUID, {
			assertAssetType: ProjectAssetType,
		});

		assertExists(asset);
	},
});

Deno.test({
	name: "getProjectAsset() assert asset type, invalid asset type",
	async fn() {
		const {assetManager} = await basicSetup();

		class ExpectedProjectAssetType {
			static type = "namespace:expected";
		}

		await assertRejects(async () => {
			await assetManager.getProjectAsset(BASIC_ASSET_UUID, {
				assertAssetType: /** @type {any} */ (ExpectedProjectAssetType),
			});
		}, Error, `Unexpected asset type while getting project asset. Expected "namespace:expected" but got "${BASIC_PROJECTASSETTYPE}".`);
	},
});

Deno.test({
	name: "getProjectAsset() assert asset type, no asset type",
	async fn() {
		const {assetManager} = await basicSetup({
			assetType: NONEXISTENT_PROJECTASSETTYPE,
		});

		class ExpectedProjectAssetType {
			static type = "namespace:expected";
		}

		await assertRejects(async () => {
			await assetManager.getProjectAsset(BASIC_ASSET_UUID, {
				assertAssetType: /** @type {any} */ (ExpectedProjectAssetType),
			});
		}, Error, `Unexpected asset type while getting project asset. Expected "namespace:expected" but got "none".`);
	},
});
