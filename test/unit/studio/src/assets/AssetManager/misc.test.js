import {assertEquals, assertExists, assertRejects} from "std/testing/asserts.ts";
import {injectMockStudioInstance} from "../../../../../../studio/src/studioInstance.js";
import {assertIsType, testTypes} from "../../../../shared/typeAssertions.js";
import {waitForMicrotasks} from "../../../../shared/waitForMicroTasks.js";
import {ASSET_SETTINGS_PATH, BASIC_ASSET_PATH, BASIC_ASSET_UUID, basicSetup} from "./shared.js";

injectMockStudioInstance(/** @type {any} */ ({}));

Deno.test({
	name: "externalChange doesn't get called when the assetManager is destructed",
	async fn() {
		const {assetManager, mockFileSystem} = await basicSetup();
		const projectAsset = assetManager.projectAssets.get(BASIC_ASSET_UUID);
		assetManager.destructor();
		assertExists(projectAsset);
		let externalChangeCalled = false;
		projectAsset.fileChangedExternally = async () => {
			externalChangeCalled = true;
		};

		mockFileSystem.fireChange({
			external: true,
			path: ["path", "to", "asset.json"],
			kind: "file",
			type: "changed",
		});

		await waitForMicrotasks();

		assertEquals(externalChangeCalled, false);
	},
});

Deno.test({
	name: "external changes from crswap are ignored",
	async fn() {
		const {assetManager, mockFileSystem} = await basicSetup({
			stubAssets: [],
		});

		const swapFilePath = ["path", "to", "file.json.crswap"];

		mockFileSystem.writeText(swapFilePath, "{}");
		mockFileSystem.fireChange({
			external: true,
			path: swapFilePath,
			kind: "file",
			type: "created",
		});

		await waitForMicrotasks();

		assertEquals(assetManager.projectAssets.size, 0);
	},
});

Deno.test({
	name: "registerAsset()",
	async fn() {
		const {assetManager, mockFileSystem} = await basicSetup();

		const path = ["path", "to", "newAsset.json"];
		await mockFileSystem.writeJson(path, {});
		await assetManager.registerAsset(path);

		await waitForMicrotasks();

		assertEquals(assetManager.projectAssets.size, 2);

		let newAsset = null;
		for (const [uuid, asset] of assetManager.projectAssets) {
			if (uuid == BASIC_ASSET_UUID) continue;
			newAsset = asset;
			break;
		}

		assertExists(newAsset);
		assertEquals(newAsset.path, path);

		const assetSettings = await mockFileSystem.readJson(ASSET_SETTINGS_PATH);
		const castAssetSettings = /** @type {import("../../../../../../studio/src/assets/AssetSettingsDiskTypes.ts").AssetSettingsDiskData?} */ (assetSettings);
		assertExists(castAssetSettings);
		assertExists(castAssetSettings.assets);
		assertEquals(Object.entries(castAssetSettings.assets).length, 1);
	},
});

Deno.test({
	name: "registerAsset() with forceAssetType = true",
	async fn() {
		const {assetManager, mockFileSystem} = await basicSetup();

		const path = ["path", "to", "newAsset.json"];
		await mockFileSystem.writeJson(path, {});
		await assetManager.registerAsset(path, null, true);

		await waitForMicrotasks();

		assertEquals(assetManager.projectAssets.size, 2);

		let newAsset = null;
		for (const [uuid, asset] of assetManager.projectAssets) {
			if (uuid == BASIC_ASSET_UUID) continue;
			newAsset = asset;
			break;
		}

		assertExists(newAsset);
		assertEquals(newAsset.path, path);

		const assetSettings = await mockFileSystem.readJson(ASSET_SETTINGS_PATH);
		const castAssetSettings = /** @type {import("../../../../../../studio/src/assets/AssetSettingsDiskTypes.ts").AssetSettingsDiskData?} */ (assetSettings);
		assertExists(castAssetSettings);
		assertExists(castAssetSettings.assets);
		assertEquals(Object.entries(castAssetSettings.assets).length, 2);
	},
});

Deno.test({
	name: "getAssetUuidFromPath()",
	async fn() {
		const {assetManager} = await basicSetup();

		const result = await assetManager.getAssetUuidFromPath(BASIC_ASSET_PATH);

		assertEquals(result, BASIC_ASSET_UUID);
	},
});

Deno.test({
	name: "getAssetUuidFromPath() non existent",
	async fn() {
		const {assetManager} = await basicSetup();

		const result = await assetManager.getAssetUuidFromPath(["non", "existent", "path.json"]);

		assertEquals(result, null);
	},
});

Deno.test({
	name: "getAssetUuidFromPath() non existent, assertExists true",
	async fn() {
		const {assetManager} = await basicSetup();

		await assertRejects(async () => {
			await assetManager.getAssetUuidFromPath(["non", "existent", "path.json"], {
				assertExists: true,
			});
		}, Error, `Failed to get project asset from "non/existent/path.json" because it wasn't found.`);
	},
});

testTypes({
	name: "getAssetUuidFromPath() has the correct return types",
	async fn() {
		const {assetManager} = await basicSetup();
		const uuidString = /** @type {import("../../../../../../src/mod.js").UuidString} */ ("");
		const uuidStringOrNull = /** @type {typeof uuidString | null} */ ("");

		// Default assertions
		const uuid1 = await assetManager.getAssetUuidFromPath(BASIC_ASSET_PATH);
		assertIsType(uuidStringOrNull, uuid1);
		assertIsType(uuid1, null);
		assertIsType(uuid1, uuidString);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, uuid1);

		// assertExists true
		const uuid2 = await assetManager.getAssetUuidFromPath(BASIC_ASSET_PATH, {
			assertExists: true,
		});
		assertIsType(uuidString, uuid2);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, uuid2);
	},
});

Deno.test({
	name: "getAssetPathFromUuid()",
	async fn() {
		const {assetManager} = await basicSetup();

		const path = await assetManager.getAssetPathFromUuid(BASIC_ASSET_UUID);

		assertEquals(path, BASIC_ASSET_PATH);
	},
});
