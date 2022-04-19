import {assertEquals, assertExists, assertInstanceOf, assertStrictEquals, assertThrows} from "asserts";
import {ProjectAsset} from "../../../../../../editor/src/assets/ProjectAsset.js";
import {BASIC_ASSET_EXTENSION, BASIC_PROJECTASSETTYPE, BASIC_UUID, UNKNOWN_ASSET_EXTENSION, basicSetup, getMocks} from "./shared.js";

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

		assertEquals(projectAsset.assetType, null);
		assertEquals(projectAsset.projectAssetTypeConstructorSync, null);

		const projectAssetType = await projectAsset.getProjectAssetType();
		assertExists(projectAssetType);
		assertInstanceOf(projectAssetType, MockProjectAssetType);

		const projectAssetTypeConstructor = await projectAsset.getProjectAssetTypeConstructor();
		assertExists(projectAssetTypeConstructor);
		assertStrictEquals(projectAssetTypeConstructor, MockProjectAssetType);

		assertEquals(projectAsset.assetType, BASIC_PROJECTASSETTYPE);
		assertStrictEquals(projectAsset.projectAssetTypeConstructorSync, MockProjectAssetType);
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
		assertEquals(projectAsset.projectAssetTypeConstructorSync, null);
		const projectAssetTypeConstructor = await projectAsset.getProjectAssetTypeConstructor();
		assertEquals(projectAssetTypeConstructor, null);
		assertEquals(projectAsset.projectAssetTypeConstructorSync, null);
	},
});

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
