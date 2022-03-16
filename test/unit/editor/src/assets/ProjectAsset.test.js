import {assertEquals, assertExists, assertInstanceOf, assertRejects, assertStrictEquals, assertThrows} from "asserts";
import {ProjectAsset} from "../../../../../editor/src/assets/ProjectAsset.js";
import {injectMockEditorInstance} from "../../../../../editor/src/editorInstance.js";
import {EditorFileSystemMemory} from "../../../../../editor/src/util/fileSystems/EditorFileSystemMemory.js";
import {createMockProjectAssetType} from "./shared/createMockProjectAssetType.js";
import {createMockProjectAssetTypeManager} from "./shared/createMockProjectAssetTypeManager.js";

const BASIC_UUID = "00000000-0000-0000-0000-000000000000";
const BASIC_PROJECTASSETTYPE = "test:basicassettype";
const BASIC_ASSET_EXTENSION = "basicassetextension";
const UNKNOWN_ASSET_EXTENSION = "unknownassetextension";

injectMockEditorInstance(/** @type {any} */ ({}));

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

	const projectAssetTypeMocks = createMockProjectAssetType(BASIC_PROJECTASSETTYPE);

	const mockProjectAssetTypeManager = createMockProjectAssetTypeManager({
		BASIC_ASSET_EXTENSION, BASIC_PROJECTASSETTYPE,
		ProjectAssetType: projectAssetTypeMocks.ProjectAssetType,
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
		...projectAssetTypeMocks,
		projectAssetArgs: /** @type {const} */ ([
			mockAssetManager,
			mockProjectAssetTypeManager,
			mockBuiltInAssetManager,
			fileSystem,
		]),
	};
}

/**
 * @template {boolean} [TIsKnown = true]
 * @param {Object} options
 * @param {Partial<import("../../../../../editor/src/assets/ProjectAsset.js").ProjectAssetOptions>} [options.extraProjectAssetOpts]
 * @param {GetMocksOptions} [options.mocksOptions]
 * @param {TIsKnown} [options.isKnownAssetType]
 */
function basicSetup({
	extraProjectAssetOpts,
	mocksOptions,
	isKnownAssetType = /** @type {TIsKnown} */ (true),
} = {}) {
	const mocks = getMocks(mocksOptions);

	const extension = isKnownAssetType ? BASIC_ASSET_EXTENSION : UNKNOWN_ASSET_EXTENSION;
	const assetPath = ["path", "to", `asset.${extension}`];
	const projectAsset = new ProjectAsset(...mocks.projectAssetArgs, {
		uuid: BASIC_UUID,
		path: assetPath,
		...extraProjectAssetOpts,
	});

	if (isKnownAssetType) {
		mocks.fileSystem.writeJson(assetPath, {
			assetType: BASIC_PROJECTASSETTYPE,
			asset: {
				num: 42,
				str: "foo",
			},
		});
	}

	const castProjectAsset = /** @type {TIsKnown extends true ? ProjectAsset<import("./shared/createMockProjectAssetType.js").MockProjectAssetType> : import("../../../../../editor/src/assets/ProjectAsset.js").ProjectAssetAny} */ (projectAsset);
	return {
		mocks,
		projectAsset: castProjectAsset,
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
		assertEquals(projectAsset.assetType, BASIC_PROJECTASSETTYPE);
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
		assertEquals(result, BASIC_PROJECTASSETTYPE);
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
		assertEquals(result, BASIC_PROJECTASSETTYPE);
	},
});

Deno.test({
	name: "guessAssetTypeFromFile(), reads json 'assetType' property from filesystem",
	async fn() {
		const {mockProjectAssetTypeManager, mockBuiltInAssetManager, fileSystem} = getMocks();
		const path = ["path", "to", "asset.json"];
		await fileSystem.writeJson(path, {
			assetType: BASIC_PROJECTASSETTYPE,
		});

		const result = await ProjectAsset.guessAssetTypeFromFile(mockBuiltInAssetManager, mockProjectAssetTypeManager, fileSystem, path);
		assertEquals(result, BASIC_PROJECTASSETTYPE);
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
				assetType: BASIC_PROJECTASSETTYPE,
				forceAssetType: true,
			},
		});

		assertEquals(projectAsset.needsAssetSettingsSave, true);
	},
});

// ==== live assets ============================================================

Deno.test({
	name: "getLiveAssetData throws if the asset doesn't have an ProjectAssetType set",
	async fn() {
		const {projectAsset} = basicSetup({isKnownAssetType: false});

		await assertRejects(async () => {
			await projectAsset.getLiveAssetData();
		}, Error, `Failed to get live asset data for asset at "path/to/asset.${UNKNOWN_ASSET_EXTENSION}" because the asset type couldn't be determined. Make sure your asset type is registered in the ProjectAssetTypeManager.`);
	},
});

Deno.test({
	name: "getLiveAssetData() returns the asset data",
	async fn() {
		const {projectAsset, mocks} = basicSetup();

		const liveAssetData = await projectAsset.getLiveAssetData();
		assertInstanceOf(liveAssetData.liveAsset, mocks.MockProjectAssetTypeLiveAsset);
		assertEquals(liveAssetData.liveAsset.num, 42);
		assertEquals(liveAssetData.liveAsset.str, "foo");
		assertEquals(liveAssetData.editorData, {
			editorNum: 42,
			editorStr: "foo",
		});
	},
});

Deno.test({
	name: "getLiveAssetData() returns existing data if it's already been loaded",
	async fn() {
		const {projectAsset} = basicSetup();

		const liveAssetData1 = await projectAsset.getLiveAssetData();
		const liveAssetData2 = await projectAsset.getLiveAssetData();
		assertStrictEquals(liveAssetData1.liveAsset, liveAssetData2.liveAsset);
		assertStrictEquals(liveAssetData1.editorData, liveAssetData2.editorData);
	},
});

Deno.test({
	name: "getLiveAssetData() returns existing data if it is currently being loaded",
	async fn() {
		const {projectAsset} = basicSetup();

		const promise1 = projectAsset.getLiveAssetData();
		const promise2 = projectAsset.getLiveAssetData();
		const liveAssetData1 = await promise1;
		const liveAssetData2 = await promise2;
		assertStrictEquals(liveAssetData1.liveAsset, liveAssetData2.liveAsset);
		assertStrictEquals(liveAssetData1.editorData, liveAssetData2.editorData);
	},
});

Deno.test({
	name: "onLiveAssetDataChange()",
	async fn() {
		const {projectAsset} = basicSetup();
		/** @type {import("../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").LiveAssetDataAny[]} */
		const calls = [];
		projectAsset.onLiveAssetDataChange(liveAsset => {
			calls.push(liveAsset);
		});

		const liveAssetData = await projectAsset.getLiveAssetData();
		assertEquals(calls.length, 1);
		assertStrictEquals(calls[0].liveAsset, liveAssetData.liveAsset);
		assertStrictEquals(calls[0].editorData, liveAssetData.editorData);

		projectAsset.destroyLiveAssetData();

		assertEquals(calls.length, 2);
		assertEquals(calls[1], {});

		const liveAssetData2 = await projectAsset.getLiveAssetData();
		assertEquals(calls.length, 3);
		assertStrictEquals(calls[2].liveAsset, liveAssetData2.liveAsset);
		assertStrictEquals(calls[2].editorData, liveAssetData2.editorData);
	},
});

Deno.test({
	name: "onLiveAssetDataChange() doesn't fire when removed",
	async fn() {
		const {projectAsset} = basicSetup();
		let callbackCalled = false;
		const cb = () => {
			callbackCalled = true;
		};
		projectAsset.onLiveAssetDataChange(cb);
		projectAsset.removeOnLiveAssetDataChange(cb);

		await projectAsset.getLiveAssetData();

		assertEquals(callbackCalled, false);
	},
});

// ==== embedded assets ========================================================

Deno.test({
	name: "creating with isEmbedded true",
	fn() {
		const {projectAsset} = basicSetup({
			extraProjectAssetOpts: {
				isEmbedded: true,
			},
		});

		assertEquals(projectAsset.isEmbedded, true);
	},
});
