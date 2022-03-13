import {assertEquals, assertExists} from "asserts";
import {AssetManager} from "../../../../../editor/src/assets/AssetManager.js";
import {EditorFileSystemMemory} from "../../../../../editor/src/util/fileSystems/EditorFileSystemMemory.js";
import {waitForMicrotasks} from "../../../shared/waitForMicroTasks.js";

const BASIC_ASSET_UUID = "BASIC_ASSET_UUID";
const ASSET_SETTINGS_PATH = ["ProjectSettings", "assetSettings.json"];

async function basicSetup() {
	const mockProjectManager = /** @type {import("../../../../../editor/src/projectSelector/ProjectManager.js").ProjectManager} */ ({});
	const mockBuiltinAssetManager = /** @type {import("../../../../../editor/src/assets/BuiltInAssetManager.js").BuiltInAssetManager} */ ({});
	const mockBuiltInDefaultAssetLinksManager = /** @type {import("../../../../../editor/src/assets/BuiltInDefaultAssetLinksManager.js").BuiltInDefaultAssetLinksManager} */ ({
		registeredAssetLinks: new Set(),
	});
	const mockProjectAssetTypeManager = /** @type {import("../../../../../editor/src/assets/ProjectAssetTypeManager.js").ProjectAssetTypeManager} */ ({});

	const mockFileSystem = new EditorFileSystemMemory();
	await mockFileSystem.writeJson(ASSET_SETTINGS_PATH, {
		assets: {
			[BASIC_ASSET_UUID]: {
				path: ["path", "to", "asset.json"],
			},
		},
	});
	await mockFileSystem.writeJson(["path", "to", "asset.json"], {});

	const assetManager = new AssetManager(mockProjectManager, mockBuiltinAssetManager, mockBuiltInDefaultAssetLinksManager, mockProjectAssetTypeManager, mockFileSystem);
	await assetManager.waitForAssetSettingsLoad();

	return {
		assetManager,
		mockFileSystem,
	};
}

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

		mockFileSystem.fireExternalChange({
			path: ["path", "to", "asset.json"],
			kind: "file",
			type: "changed",
		});

		await waitForMicrotasks();

		assertEquals(externalChangeCalled, false);
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

		/** @type {import("../../../../../editor/src/assets/AssetSettingsDiskTypes.js").AssetSettingsDiskData?} */
		const assetSettings = await mockFileSystem.readJson(ASSET_SETTINGS_PATH);
		assertExists(assetSettings);
		assertExists(assetSettings.assets);
		assertEquals(Object.entries(assetSettings.assets).length, 1);
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

		/** @type {import("../../../../../editor/src/assets/AssetSettingsDiskTypes.js").AssetSettingsDiskData?} */
		const assetSettings = await mockFileSystem.readJson(ASSET_SETTINGS_PATH);
		assertExists(assetSettings);
		assertExists(assetSettings.assets);
		assertEquals(Object.entries(assetSettings.assets).length, 2);
	},
});
