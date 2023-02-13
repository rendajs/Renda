import {AssetManager} from "../../../../../../studio/src/assets/AssetManager.js";
import {MemoryEditorFileSystem} from "../../../../../../studio/src/util/fileSystems/MemoryEditorFileSystem.js";
import {createMockProjectAssetType} from "../../../shared/createMockProjectAssetType.js";
import {createMockProjectAssetTypeManager} from "../../../shared/createMockProjectAssetTypeManager.js";

export const BASIC_ASSET_UUID = "BASIC_ASSET_UUID";
export const NONEXISTENT_ASSET_UUID = "NONEXISTENT_ASSET_UUID";
export const BASIC_ASSET_PATH = ["path", "to", "asset.json"];
export const NON_EXISTENT_ASSET_PATH = ["path", "to", "nonexistent", "asset.json"];
export const BASIC_PROJECTASSETTYPE = "test:basicprojectassettype";
export const NONEXISTENT_PROJECTASSETTYPE = "test:nonexistentprojectassettype";
export const ASSET_SETTINGS_PATH = ["ProjectSettings", "assetSettings.json"];
export const DEFAULT_BASIC_ASSET_NUM_ON_DISK = 2309779523;
export const DEFAULT_BASIC_ASSET_STR_ON_DISK = "basic asset on disk";
export const BASIC_PERSISTENCE_KEY = "persistenceKey";
export const STRINGIFIED_PERSISTENCE_KEY = `"persistenceKey"`;
export const BASIC_ASSET_EXTENSION = "BASIC_ASSET_EXTENSION";

/**
 * @typedef StubAssetConfig
 * @property {string} assetType
 * @property {import("../../../../../../src/mod.js").UuidString} uuid
 * @property {import("../../../../../../studio/src/util/fileSystems/EditorFileSystem.js").EditorFileSystemPath} path
 * @property {any} [jsonContent]
 */

/**
 * @param {object} options
 * @param {boolean} [options.waitForAssetListsLoad]
 * @param {StubAssetConfig[]} [options.stubAssets]
 * @param {import("../../../../../../studio/src/assets/AssetSettingsDiskTypes.js").AssetSettingsDiskData?} [options.assetSettings]
 */
export async function basicSetup({
	waitForAssetListsLoad = true,
	stubAssets = [
		{
			assetType: BASIC_PROJECTASSETTYPE,
			uuid: BASIC_ASSET_UUID,
			path: BASIC_ASSET_PATH,
			jsonContent: {
				num: DEFAULT_BASIC_ASSET_NUM_ON_DISK,
				str: DEFAULT_BASIC_ASSET_STR_ON_DISK,
			},
		},
	],
	assetSettings = null,
} = {}) {
	const mockProjectManager = /** @type {import("../../../../../../studio/src/projectSelector/ProjectManager.js").ProjectManager} */ ({});

	const mockBuiltinAssetManager = /** @type {import("../../../../../../studio/src/assets/BuiltInAssetManager.js").BuiltInAssetManager} */ ({
		/** @type {Map<import("../../../../../../src/mod.js").UuidString, import("../../../../../../studio/src/assets/ProjectAsset.js").ProjectAssetAny>} */
		assets: new Map(),
		async waitForLoad() {},
	});

	const mockBuiltInDefaultAssetLinksManager = /** @type {import("../../../../../../studio/src/assets/BuiltInDefaultAssetLinksManager.js").BuiltInDefaultAssetLinksManager} */ ({
		/** @type {Set<import("../../../../../../studio/src/assets/autoRegisterBuiltInDefaultAssetLinks.js").BuiltInDefaultAssetLink>} */
		registeredAssetLinks: new Set(),
	});

	const {MockProjectAssetType, ProjectAssetType, MockProjectAssetTypeLiveAsset} = createMockProjectAssetType(BASIC_PROJECTASSETTYPE);

	const mockProjectAssetTypeManager = createMockProjectAssetTypeManager({
		BASIC_ASSET_EXTENSION, BASIC_PROJECTASSETTYPE,
		ProjectAssetType,
	});

	const mockFileSystem = new MemoryEditorFileSystem();

	let assetSettingsAssets = null;
	if (assetSettings == null) {
		assetSettings = {
			assets: {},
		};
		assetSettingsAssets = assetSettings.assets;
	}

	for (const stubAsset of stubAssets) {
		if (assetSettingsAssets) {
			assetSettingsAssets[stubAsset.uuid] = {
				path: stubAsset.path,
			};
		}

		await mockFileSystem.writeJson(stubAsset.path, {
			assetType: stubAsset.assetType,
			asset: stubAsset.jsonContent || {},
		});
	}

	await mockFileSystem.writeJson(ASSET_SETTINGS_PATH, assetSettings);

	const assetManager = new AssetManager(mockProjectManager, mockBuiltinAssetManager, mockBuiltInDefaultAssetLinksManager, mockProjectAssetTypeManager, mockFileSystem);
	if (waitForAssetListsLoad) {
		await assetManager.waitForAssetListsLoad();
	}

	return {
		assetManager,
		mockFileSystem,
		MockProjectAssetType,
		ProjectAssetType,
		MockProjectAssetTypeLiveAsset,
	};
}
