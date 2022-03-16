import {assertEquals, assertExists, assertStrictEquals} from "asserts";
import {AssetManager} from "../../../../../editor/src/assets/AssetManager.js";
import {injectMockEditorInstance} from "../../../../../editor/src/editorInstance.js";
import {EditorFileSystemMemory} from "../../../../../editor/src/util/fileSystems/EditorFileSystemMemory.js";
import {waitForMicrotasks} from "../../../shared/waitForMicroTasks.js";
import {createMockProjectAssetType} from "./shared/createMockProjectAssetType.js";
import {createMockProjectAssetTypeManager} from "./shared/createMockProjectAssetTypeManager.js";

const BASIC_ASSET_UUID = "BASIC_ASSET_UUID";
const BASIC_ASSET_EXTENSION = "BASIC_ASSET_EXTENSION";
const BASIC_ASSET_PATH = ["path", "to", "asset.json"];
const BASIC_PROJECTASSETTYPE = "test:basicprojectassettype";
const ASSET_SETTINGS_PATH = ["ProjectSettings", "assetSettings.json"];

injectMockEditorInstance(/** @type {any} */ ({}));

async function basicSetup({
	waitForAssetSettingsLoad = true,
} = {}) {
	const mockProjectManager = /** @type {import("../../../../../editor/src/projectSelector/ProjectManager.js").ProjectManager} */ ({});

	const mockBuiltinAssetManager = /** @type {import("../../../../../editor/src/assets/BuiltInAssetManager.js").BuiltInAssetManager} */ ({
		assets: new Map(),
	});

	const mockBuiltInDefaultAssetLinksManager = /** @type {import("../../../../../editor/src/assets/BuiltInDefaultAssetLinksManager.js").BuiltInDefaultAssetLinksManager} */ ({
		registeredAssetLinks: new Set(),
	});

	const {MockProjectAssetType, ProjectAssetType} = createMockProjectAssetType(BASIC_PROJECTASSETTYPE);

	const mockProjectAssetTypeManager = createMockProjectAssetTypeManager({
		BASIC_ASSET_EXTENSION, BASIC_PROJECTASSETTYPE,
		ProjectAssetType,
	});

	const mockFileSystem = new EditorFileSystemMemory();
	await mockFileSystem.writeJson(ASSET_SETTINGS_PATH, {
		assets: {
			[BASIC_ASSET_UUID]: {
				path: BASIC_ASSET_PATH,
			},
		},
	});
	await mockFileSystem.writeJson(BASIC_ASSET_PATH, {
		assetType: BASIC_PROJECTASSETTYPE,
	});

	const assetManager = new AssetManager(mockProjectManager, mockBuiltinAssetManager, mockBuiltInDefaultAssetLinksManager, mockProjectAssetTypeManager, mockFileSystem);
	if (waitForAssetSettingsLoad) await assetManager.waitForAssetSettingsLoad();

	return {
		assetManager,
		mockFileSystem,
		MockProjectAssetType,
		ProjectAssetType,
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
	name: "getProjectAsset()",
	async fn() {
		const {assetManager} = await basicSetup();

		const asset = await assetManager.getProjectAsset(BASIC_ASSET_UUID);

		assertExists(asset);
	},
});

Deno.test({
	name: "getProjectAssetImmediate() when asset settings are not loaded returns null",
	async fn() {
		const {assetManager} = await basicSetup({waitForAssetSettingsLoad: false});

		const asset = assetManager.getProjectAssetImmediate(BASIC_ASSET_UUID);

		assertEquals(asset, null);

		await assetManager.waitForAssetSettingsLoad();
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

Deno.test({
	name: "createEmbeddedAsset()",
	async fn() {
		const {assetManager} = await basicSetup();

		const embeddedAsset = assetManager.createEmbeddedAsset(BASIC_PROJECTASSETTYPE);

		assertEquals(embeddedAsset.isEmbedded, true);
		assertEquals(embeddedAsset.assetType, BASIC_PROJECTASSETTYPE);
	},
});

Deno.test({
	name: "getProjectAssetForLiveAsset() with null",
	async fn() {
		const {assetManager} = await basicSetup();
		const projectAsset = assetManager.getProjectAssetForLiveAsset(null);
		assertEquals(projectAsset, null);
	},
});

Deno.test({
	name: "getProjectAssetForLiveAsset() with live asset from project",
	async fn() {
		const {assetManager} = await basicSetup();
		const projectAsset = await assetManager.getProjectAsset(BASIC_ASSET_UUID);
		assertExists(projectAsset);
		const liveAsset = await projectAsset.getLiveAsset();
		const result = assetManager.getProjectAssetForLiveAsset(liveAsset);
		assertStrictEquals(result, projectAsset);
	},
});

Deno.test({
	name: "getProjectAssetForLiveAsset() with non-live asset",
	async fn() {
		const {assetManager} = await basicSetup();
		const actual = assetManager.getProjectAssetForLiveAsset({});
		assertEquals(actual, null);
	},
});
