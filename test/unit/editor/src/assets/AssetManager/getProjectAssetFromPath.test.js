import {assertEquals, assertExists, assertRejects} from "std/testing/asserts.ts";
import {injectMockEditorInstance} from "../../../../../../editor/src/editorInstance.js";
import {createMockProjectAssetType} from "../shared/createMockProjectAssetType.js";
import {BASIC_ASSET_PATH, BASIC_ASSET_UUID, BASIC_PROJECTASSETTYPE, NONEXISTENT_ASSET_UUID, NONEXISTENT_PROJECTASSETTYPE, NON_EXISTENT_ASSET_PATH, basicSetup} from "./shared.js";

injectMockEditorInstance(/** @type {any} */ ({}));

Deno.test({
	name: "getProjectAssetFromPath()",
	async fn() {
		const {assetManager} = await basicSetup();

		const result = await assetManager.getProjectAssetFromPath(BASIC_ASSET_PATH);

		assertExists(result);
	},
});

Deno.test({
	name: "getProjectAssetFromPath() non existent",
	async fn() {
		const {assetManager} = await basicSetup();

		const result = await assetManager.getProjectAssetFromPath(NON_EXISTENT_ASSET_PATH);

		assertEquals(result, null);
	},
});

Deno.test({
	name: "getProjectAssetFromPath() assert asset type, valid asset type",
	async fn() {
		const {assetManager, ProjectAssetType} = await basicSetup();

		const asset = await assetManager.getProjectAssetFromPath(BASIC_ASSET_PATH, {
			assertionOptions: {
				assertAssetType: ProjectAssetType,
			},
		});

		assertExists(asset);
	},
});

Deno.test({
	name: "getProjectAssetFromPath() assert asset type, invalid asset type",
	async fn() {
		const {assetManager} = await basicSetup();

		const {ProjectAssetType: ExpectedProjectAssetType} = createMockProjectAssetType("namespace:expected");

		await assertRejects(async () => {
			await assetManager.getProjectAssetFromPath(BASIC_ASSET_PATH, {
				assertionOptions: {
					assertAssetType: ExpectedProjectAssetType,
				},
			});
		}, Error, `Unexpected asset type while getting project asset. Expected "namespace:expected" but got "${BASIC_PROJECTASSETTYPE}".`);
	},
});

Deno.test({
	name: "getProjectAssetFromPath() with registerIfNecessary false",
	async fn() {
		const {assetManager, mockFileSystem} = await basicSetup();

		mockFileSystem.writeFile(NON_EXISTENT_ASSET_PATH, "test");

		const result1 = await assetManager.getProjectAssetFromPath(NON_EXISTENT_ASSET_PATH, {
			registerIfNecessary: false,
		});
		assertEquals(result1, null);

		const result2 = await assetManager.getProjectAssetFromPath(NON_EXISTENT_ASSET_PATH);
		assertExists(result2);
	},
});
