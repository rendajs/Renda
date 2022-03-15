import {assertEquals, assertExists, assertStrictEquals, assertThrows} from "asserts";
import {ProjectAsset} from "../../../../../editor/src/assets/ProjectAsset.js";
import {injectMockEditorInstance} from "../../../../../editor/src/editorInstance.js";
import {EditorFileSystemMemory} from "../../../../../editor/src/util/fileSystems/EditorFileSystemMemory.js";
import {assertInstanceOf} from "../../../shared/asserts.js";

const BASIC_UUID = "00000000-0000-0000-0000-000000000000";
const BASIC_ASSET_TYPE = "test:basicassettype";
const BASIC_ASSET_EXTENSION = "basicassetextension";
const UNKNOWN_ASSET_EXTENSION = "unknownassetextension";

injectMockEditorInstance(/** @type {any} */ ({}));

/**
 * @param {string} type
 */
function createMockAssetType(type) {
	class ProjectAssetType {
		static type = type;
	}

	const castUnknown = /** @type {unknown} */ (ProjectAssetType);
	const castProjectAssetType = /** @type {import("../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").ProjectAssetTypeAny} */ (castUnknown);

	return {
		MockProjectAssetType: ProjectAssetType,
		ProjectAssetType: castProjectAssetType,
	};
}

/**
 * @typedef GetMocksOptions
 * @property {boolean} [builtInAssetManagerAllowAssetEditingValue]
 */

/**
 * @param {GetMocksOptions} options
 */
function getMocks({
	builtInAssetManagerAllowAssetEditingValue = false,
} = {}) {
	const mockAssetManager = /** @type {import("../../../../../editor/src/assets/AssetManager.js").AssetManager} */ ({});

	const {MockProjectAssetType, ProjectAssetType} = createMockAssetType(BASIC_ASSET_TYPE);

	const mockProjectAssetTypeManager = /** @type {import("../../../../../editor/src/assets/ProjectAssetTypeManager.js").ProjectAssetTypeManager} */ ({
		*getAssetTypesForExtension(extension) {
			if (extension == BASIC_ASSET_EXTENSION) {
				yield ProjectAssetType;
			}
		},
		getAssetType(type) {
			if (type == BASIC_ASSET_TYPE) {
				return ProjectAssetType;
			}
			return null;
		},
	});

	const mockBuiltInAssetManager = /** @type {import("../../../../../editor/src/assets/BuiltInAssetManager.js").BuiltInAssetManager} */ ({
		allowAssetEditing: builtInAssetManagerAllowAssetEditingValue,
	});

	const fileSystem = new EditorFileSystemMemory();

	return {
		mockAssetManager,
		mockProjectAssetTypeManager,
		mockBuiltInAssetManager,
		fileSystem,
		MockProjectAssetType, ProjectAssetType,
		projectAssetArgs: /** @type {const} */ ([
			mockAssetManager,
			mockProjectAssetTypeManager,
			mockBuiltInAssetManager,
			fileSystem,
		]),
	};
}

/**
 * @param {Object} options
 * @param {Partial<import("../../../../../editor/src/assets/ProjectAsset.js").ProjectAssetOptions>} [options.extraProjectAssetOpts]
 * @param {GetMocksOptions} [options.mocksOptions]
 */
function basicSetup({
	extraProjectAssetOpts,
	mocksOptions,
} = {}) {
	const mocks = getMocks(mocksOptions);
	const projectAsset = new ProjectAsset(...mocks.projectAssetArgs, {
		uuid: BASIC_UUID,
		path: ["path", "to", `asset.${UNKNOWN_ASSET_EXTENSION}`],
		...extraProjectAssetOpts,
	});

	return {
		mocks,
		projectAsset,
	};
}

Deno.test({
	name: "throws an error when no file system is provided for a non-built in asset",
	fn() {
		const {mockAssetManager, mockProjectAssetTypeManager, mockBuiltInAssetManager} = getMocks();
		assertThrows(() => {
			new ProjectAsset(mockAssetManager, mockProjectAssetTypeManager, mockBuiltInAssetManager, null, {
				uuid: BASIC_UUID,
			});
		}, Error, "fileSystem can only be null for builtIn assets");
	},
});

Deno.test({
	name: "new ProjectAsset with guessed asset type from file extension",
	async fn() {
		const {projectAssetArgs, MockProjectAssetType} = getMocks();
		const projectAsset = new ProjectAsset(...projectAssetArgs, {
			uuid: BASIC_UUID,
			path: ["path", "to", `asset.${BASIC_ASSET_EXTENSION}`],
		});

		const projectAssetType = await projectAsset.getProjectAssetType();
		assertExists(projectAssetType);
		assertInstanceOf(projectAssetType, MockProjectAssetType);
		assertEquals(projectAsset.assetType, BASIC_ASSET_TYPE);
		assertStrictEquals(projectAsset.projectAssetTypeConstructor, MockProjectAssetType);
	},
});

Deno.test({
	name: "new ProjectAsset without an asset type",
	async fn() {
		const {projectAssetArgs} = getMocks();
		const projectAsset = new ProjectAsset(...projectAssetArgs, {
			uuid: BASIC_UUID,
			path: ["path", "to", `asset.${UNKNOWN_ASSET_EXTENSION}`],
		});

		const projectAssetType = await projectAsset.getProjectAssetType();
		assertEquals(projectAssetType, null);
		assertEquals(projectAsset.projectAssetTypeConstructor, null);
	},
});

// ==== guessAssetTypeFromPath() ===============================================

Deno.test({
	name: "guessAssetTypeFromPath(), empty path array",
	fn() {
		const {mockProjectAssetTypeManager} = getMocks();

		const result = ProjectAsset.guessAssetTypeFromPath(mockProjectAssetTypeManager, []);
		assertEquals(result, null);
	},
});

Deno.test({
	name: "guessAssetTypeFromPath(), json file",
	fn() {
		const {mockProjectAssetTypeManager} = getMocks();

		const result = ProjectAsset.guessAssetTypeFromPath(mockProjectAssetTypeManager, ["path", "to", "asset.json"]);
		assertEquals(result, null);
	},
});

Deno.test({
	name: "guessAssetTypeFromPath(), no extension",
	fn() {
		const {mockProjectAssetTypeManager} = getMocks();

		const result = ProjectAsset.guessAssetTypeFromPath(mockProjectAssetTypeManager, ["path", "to", "asset"]);
		assertEquals(result, null);
	},
});

Deno.test({
	name: "guessAssetTypeFromPath(), basic extension",
	fn() {
		const {mockProjectAssetTypeManager} = getMocks();

		const result = ProjectAsset.guessAssetTypeFromPath(mockProjectAssetTypeManager, ["path", "to", `asset.${BASIC_ASSET_EXTENSION}`]);
		assertEquals(result, BASIC_ASSET_TYPE);
	},
});

Deno.test({
	name: "guessAssetTypeFromPath(), unknown extension",
	fn() {
		const {mockProjectAssetTypeManager} = getMocks();

		const result = ProjectAsset.guessAssetTypeFromPath(mockProjectAssetTypeManager, ["path", "to", `asset.${UNKNOWN_ASSET_EXTENSION}`]);
		assertEquals(result, null);
	},
});

// ==== guessAssetTypeFromFile() ===============================================

Deno.test({
	name: "guessAssetTypeFromFile(), checks the path first",
	async fn() {
		const {mockProjectAssetTypeManager, mockBuiltInAssetManager, fileSystem} = getMocks();

		const result = await ProjectAsset.guessAssetTypeFromFile(mockBuiltInAssetManager, mockProjectAssetTypeManager, fileSystem, ["path", "to", `asset.${BASIC_ASSET_EXTENSION}`]);
		assertEquals(result, BASIC_ASSET_TYPE);
	},
});

Deno.test({
	name: "guessAssetTypeFromFile(), reads json 'assetType' property from filesystem",
	async fn() {
		const {mockProjectAssetTypeManager, mockBuiltInAssetManager, fileSystem} = getMocks();
		const path = ["path", "to", "asset.json"];
		await fileSystem.writeJson(path, {
			assetType: BASIC_ASSET_TYPE,
		});

		const result = await ProjectAsset.guessAssetTypeFromFile(mockBuiltInAssetManager, mockProjectAssetTypeManager, fileSystem, path);
		assertEquals(result, BASIC_ASSET_TYPE);
	},
});

Deno.test({
	name: "guessAssetTypeFromFile(), is null if json fill doesn't contain an assetType property",
	async fn() {
		const {mockProjectAssetTypeManager, mockBuiltInAssetManager, fileSystem} = getMocks();
		const path = ["path", "to", "asset.json"];
		await fileSystem.writeJson(path, {});

		const result = await ProjectAsset.guessAssetTypeFromFile(mockBuiltInAssetManager, mockProjectAssetTypeManager, fileSystem, path);
		assertEquals(result, null);
	},
});

// ==== getters ================================================================

Deno.test({
	name: "get fileName",
	fn() {
		const {projectAssetArgs} = getMocks();

		const projectAsset1 = new ProjectAsset(...projectAssetArgs, {
			uuid: BASIC_UUID,
			path: ["path", "to", "asset1.json"],
		});
		assertEquals(projectAsset1.fileName, "asset1.json");

		const projectAsset2 = new ProjectAsset(...projectAssetArgs, {
			uuid: BASIC_UUID,
			path: ["asset2.json"],
		});
		assertEquals(projectAsset2.fileName, "asset2.json");
	},
});

Deno.test({
	name: "editable is true if an asset is not built-in",
	fn() {
		const {projectAsset} = basicSetup();

		assertEquals(projectAsset.editable, true);
	},
});

Deno.test({
	name: "editable is true if an asset is built-in and the builtInAssetManager has allowAssetEditing set to true",
	fn() {
		const {projectAsset} = basicSetup({
			extraProjectAssetOpts: {
				isBuiltIn: true,
			},
			mocksOptions: {
				builtInAssetManagerAllowAssetEditingValue: true,
			},
		});

		assertEquals(projectAsset.editable, true);
	},
});

Deno.test({
	name: "editable is false if an asset is built-in and the builtInAssetManager has allowAssetEditing set to false",
	fn() {
		const {projectAsset} = basicSetup({
			extraProjectAssetOpts: {
				isBuiltIn: true,
			},
			mocksOptions: {
				builtInAssetManagerAllowAssetEditingValue: false,
			},
		});

		assertEquals(projectAsset.editable, false);
	},
});

Deno.test({
	name: "needsAssetSettingsSave is false by default",
	fn() {
		const {projectAsset} = basicSetup();

		assertEquals(projectAsset.needsAssetSettingsSave, false);
	},
});

Deno.test({
	name: "makeUuidConsistent() makes needsAssetSettingsSave true",
	fn() {
		const {projectAsset} = basicSetup();

		projectAsset.makeUuidConsistent();

		assertEquals(projectAsset.needsAssetSettingsSave, true);
	},
});

Deno.test({
	name: "forced asset types makes needsAssetSettingsSave true",
	fn() {
		const {projectAsset} = basicSetup({
			extraProjectAssetOpts: {
				assetType: BASIC_ASSET_TYPE,
				forceAssetType: true,
			},
		});

		assertEquals(projectAsset.needsAssetSettingsSave, true);
	},
});
