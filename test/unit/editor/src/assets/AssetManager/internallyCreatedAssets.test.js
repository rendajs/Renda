import {assertEquals, assertExists, assertNotStrictEquals, assertStrictEquals} from "std/testing/asserts.ts";
import {injectMockEditorInstance} from "../../../../../../editor/src/editorInstance.js";
import {BASIC_ASSET_UUID, basicSetup} from "./shared.js";

injectMockEditorInstance(/** @type {any} */ ({}));

Deno.test({
	name: "Using the same persistence data twice results in the same asset instance if a project asset is requested",
	async fn() {
		const {assetManager, mockFileSystem} = await basicSetup();

		const asset1 = assetManager.getOrCreateInternallyCreatedAsset({foo: "bar"});

		// Request a project asset to make the asset become persistent.
		asset1.getProjectAsset();

		const asset2 = assetManager.getOrCreateInternallyCreatedAsset({foo: "bar"});
		assertStrictEquals(asset1, asset2);

		// Trigger a save in case this hasn't been done yet.
		await assetManager.saveAssetSettings();

		/** @type {import("../../../../../../editor/src/assets/AssetSettingsDiskTypes.js").AssetSettingsDiskData?} */
		const projectSettings = await mockFileSystem.readJson(["ProjectSettings", "assetSettings.json"]);
		assertExists(projectSettings);
		// Internally created assets must only be set if the project asset's uuid is marked as persistent.
		assertEquals(projectSettings.internallyCreatedAssets, undefined);
	},
});

Deno.test({
	name: "creating internally created assets and then doing nothing with it",
	async fn() {
		const {assetManager, mockFileSystem} = await basicSetup();

		const asset1 = assetManager.getOrCreateInternallyCreatedAsset({foo: "bar"});
		const asset2 = assetManager.getOrCreateInternallyCreatedAsset({foo: "bar"});

		assertNotStrictEquals(asset1, asset2);

		// Trigger a save in case this hasn't been done yet.
		await assetManager.saveAssetSettings();

		/** @type {import("../../../../../../editor/src/assets/AssetSettingsDiskTypes.js").AssetSettingsDiskData?} */
		const projectSettings = await mockFileSystem.readJson(["ProjectSettings", "assetSettings.json"]);
		assertExists(projectSettings);
		// Internally created assets must only be set if the project asset's uuid is marked as persistent.
		assertEquals(projectSettings.internallyCreatedAssets, undefined);
	},
});

Deno.test({
	name: "Making an internally created asset have a persistent uuid causes it to get saved in the project settings",
	async fn() {
		const {assetManager, mockFileSystem} = await basicSetup();

		const asset1 = assetManager.getOrCreateInternallyCreatedAsset({foo: "bar"});

		const projectAsset = asset1.getProjectAsset();
		await assetManager.makeAssetUuidPersistent(projectAsset);

		const asset2 = assetManager.getOrCreateInternallyCreatedAsset({foo: "bar"});
		assertStrictEquals(asset1, asset2);

		/** @type {import("../../../../../../editor/src/assets/AssetSettingsDiskTypes.js").AssetSettingsDiskData?} */
		const projectSettings = await mockFileSystem.readJson(["ProjectSettings", "assetSettings.json"]);
		assertExists(projectSettings);
		assertEquals(projectSettings.internallyCreatedAssets, [
			{
				uuid: projectAsset.uuid,
				persistenceData: {foo: "bar"},
			},
		]);
	},
});

Deno.test({
	name: "If internally created asset persistence data is saved in the asset settings, the uuid should be persistent",
	async fn() {
		const {assetManager, mockFileSystem} = await basicSetup({
			assetSettings: {
				internallyCreatedAssets: [
					{
						uuid: BASIC_ASSET_UUID,
						persistenceData: {foo: "bar"},
					},
				],
			},
		});

		const asset1 = assetManager.getOrCreateInternallyCreatedAsset({foo: "bar"});
		// We request it a second time first because if we request the project asset we'll get the same asset instance.
		// But we want to know if the same instance is also returned without calling `getProjectAsset()`.
		const asset2 = assetManager.getOrCreateInternallyCreatedAsset({foo: "bar"});
		assertStrictEquals(asset1, asset2);

		const projectAsset = asset1.getProjectAsset();
		assertStrictEquals(projectAsset.uuid, BASIC_ASSET_UUID);

		// Verify that the uuid stays the same when calling `makeAssetUuidPersistent()` again.
		await assetManager.makeAssetUuidPersistent(projectAsset);

		/** @type {import("../../../../../../editor/src/assets/AssetSettingsDiskTypes.js").AssetSettingsDiskData?} */
		const projectSettings = await mockFileSystem.readJson(["ProjectSettings", "assetSettings.json"]);
		assertExists(projectSettings);
		assertEquals(projectSettings.internallyCreatedAssets, [
			{
				uuid: BASIC_ASSET_UUID,
				persistenceData: {foo: "bar"},
			},
		]);
	},
});
