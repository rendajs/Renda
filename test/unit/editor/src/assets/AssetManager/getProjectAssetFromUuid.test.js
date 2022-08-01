import {assertEquals, assertExists, assertRejects} from "std/testing/asserts.ts";
import {injectMockEditorInstance} from "../../../../../../editor/src/editorInstance.js";
import {createMockProjectAssetType} from "../shared/createMockProjectAssetType.js";
import {BASIC_ASSET_UUID, BASIC_PROJECTASSETTYPE, NONEXISTENT_ASSET_UUID, NONEXISTENT_PROJECTASSETTYPE, basicSetup} from "./shared.js";

injectMockEditorInstance(/** @type {any} */ ({}));

Deno.test({
	name: "getProjectAssetFromUuid()",
	async fn() {
		const {assetManager} = await basicSetup();

		const asset = await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID);

		assertExists(asset);
	},
});

Deno.test({
	name: "getProjectAssetFromUuid() non existent",
	async fn() {
		const {assetManager} = await basicSetup();

		const asset = await assetManager.getProjectAssetFromUuid(NONEXISTENT_ASSET_UUID);

		assertEquals(asset, null);
	},
});

Deno.test({
	name: "getProjectAssetFromUuid() assert asset type, valid asset type",
	async fn() {
		const {assetManager, ProjectAssetType} = await basicSetup();

		const asset = await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID, {
			assertAssetType: ProjectAssetType,
		});

		assertExists(asset);
	},
});

Deno.test({
	name: "getProjectAssetFromUuid() assert asset type array, valid asset type",
	async fn() {
		const {assetManager, ProjectAssetType} = await basicSetup();
		const {ProjectAssetType: SecondProjectAssetType} = createMockProjectAssetType("test:secondProjectAssetType");

		const asset = await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID, {
			assertAssetType: [ProjectAssetType, SecondProjectAssetType],
		});

		assertExists(asset);
	},
});

Deno.test({
	name: "getProjectAssetFromUuid() assert asset type, invalid asset type",
	async fn() {
		const {assetManager} = await basicSetup();

		const {ProjectAssetType: ExpectedProjectAssetType} = createMockProjectAssetType("namespace:expected");

		await assertRejects(async () => {
			await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID, {
				assertAssetType: ExpectedProjectAssetType,
			});
		}, Error, `Unexpected asset type while getting project asset. Expected "namespace:expected" but got "${BASIC_PROJECTASSETTYPE}".`);
	},
});

Deno.test({
	name: "getProjectAssetFromUuid() assert asset type array, invalid asset type",
	async fn() {
		const {assetManager} = await basicSetup();

		const {ProjectAssetType: ExpectedProjectAssetType1} = createMockProjectAssetType("namespace:expected1");
		const {ProjectAssetType: ExpectedProjectAssetType2} = createMockProjectAssetType("namespace:expected2");
		const {ProjectAssetType: ExpectedProjectAssetType3} = createMockProjectAssetType("namespace:expected3");

		await assertRejects(async () => {
			await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID, {
				assertAssetType: [ExpectedProjectAssetType1, ExpectedProjectAssetType2, ExpectedProjectAssetType3],
			});
		}, Error, `Unexpected asset type while getting project asset. Expected one of "namespace:expected1", "namespace:expected2" or "namespace:expected3" but got "${BASIC_PROJECTASSETTYPE}".`);
	},
});

Deno.test({
	name: "getProjectAssetFromUuid() assert asset type with empty array",
	async fn() {
		const {assetManager} = await basicSetup();

		await assertRejects(async () => {
			await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID, {
				assertAssetType: [],
			});
		}, Error, "Failed to assert the asset type, an empty array was provided.");
	},
});

Deno.test({
	name: "getProjectAssetFromUuid() assert asset type, no asset type",
	async fn() {
		const {assetManager} = await basicSetup({
			assetType: NONEXISTENT_PROJECTASSETTYPE,
		});

		class ExpectedProjectAssetType {
			static type = "namespace:expected";
		}

		await assertRejects(async () => {
			await assetManager.getProjectAssetFromUuid(BASIC_ASSET_UUID, {
				assertAssetType: /** @type {any} */ (ExpectedProjectAssetType),
			});
		}, Error, `Unexpected asset type while getting project asset. Expected "namespace:expected" but got "none".`);
	},
});
