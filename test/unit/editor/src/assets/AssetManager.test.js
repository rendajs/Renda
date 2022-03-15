import {assertEquals, assertExists} from "asserts";
import {AssetManager} from "../../../../../editor/src/assets/AssetManager.js";
import {injectMockEditorInstance} from "../../../../../editor/src/editorInstance.js";
import {EditorFileSystemMemory} from "../../../../../editor/src/util/fileSystems/EditorFileSystemMemory.js";
import {waitForMicrotasks} from "../../../shared/waitForMicroTasks.js";
import {createMockProjectAssetType} from "./shared/createMockProjectAssetType.js";

const BASIC_ASSET_UUID = "BASIC_ASSET_UUID";
const BASIC_PROJECTASSETTYPE = "test:basicprojectassettype";
const ASSET_SETTINGS_PATH = ["ProjectSettings", "assetSettings.json"];

injectMockEditorInstance(/** @type {any} */ ({}));

async function basicSetup() {
	const mockProjectManager = /** @type {import("../../../../../editor/src/projectSelector/ProjectManager.js").ProjectManager} */ ({});
	const mockBuiltinAssetManager = /** @type {import("../../../../../editor/src/assets/BuiltInAssetManager.js").BuiltInAssetManager} */ ({});
	const mockBuiltInDefaultAssetLinksManager = /** @type {import("../../../../../editor/src/assets/BuiltInDefaultAssetLinksManager.js").BuiltInDefaultAssetLinksManager} */ ({
		registeredAssetLinks: new Set(),
	});

	const {MockProjectAssetType, ProjectAssetType} = createMockProjectAssetType(BASIC_PROJECTASSETTYPE);

	const mockProjectAssetTypeManager = /** @type {import("../../../../../editor/src/assets/ProjectAssetTypeManager.js").ProjectAssetTypeManager} */ ({
		getAssetType(type) {
			if (type == BASIC_PROJECTASSETTYPE) {
				return ProjectAssetType;
			}
			return null;
		},
	});

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
	name: "createEmbeddedAsset()",
	async fn() {
		const {assetManager} = await basicSetup();

		const embeddedAsset = assetManager.createEmbeddedAsset(BASIC_PROJECTASSETTYPE);

		assertEquals(embeddedAsset.isEmbedded, true);
		assertEquals(embeddedAsset.assetType, BASIC_PROJECTASSETTYPE);
	},
});
