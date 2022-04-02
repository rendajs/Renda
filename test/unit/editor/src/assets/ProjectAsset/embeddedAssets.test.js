import {AssertionError, assert, assertEquals, assertThrows} from "asserts";
import {BASIC_PROJECTASSETTYPE, basicSetup} from "./shared.js";

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

Deno.test({
	name: "readAssetData() on an embedded asset is an empty object by default",
	async fn() {
		const {projectAsset, mocks} = basicSetup({
			extraProjectAssetOpts: {
				isEmbedded: true,
				assetType: BASIC_PROJECTASSETTYPE,
				path: [],
			},
		});

		mocks.fileSystem.readFile = async () => {
			throw new AssertionError("embedded assets should not read from disk.");
		};

		const result = await projectAsset.readAssetData();
		assertEquals(result, {});
	},
});

Deno.test({
	name: "writeAssetData() and then readAssetData() on an embedded asset",
	async fn() {
		const {projectAsset, mocks} = basicSetup({
			extraProjectAssetOpts: {
				isEmbedded: true,
				assetType: BASIC_PROJECTASSETTYPE,
				path: [],
			},
		});

		mocks.fileSystem.readFile = async () => {
			throw new AssertionError("embedded assets should not read from disk.");
		};
		mocks.fileSystem.writeFile = async () => {
			throw new AssertionError("embedded assets should not write to disk.");
		};

		const writeData = {
			num: 123,
			str: "foo",
		};

		await projectAsset.writeAssetData(writeData);

		writeData.str = "modification";

		const result = await projectAsset.readAssetData();
		assert(result.str != "modification", "writeAssetData() should make a copy of the data");
		assertEquals(result, {
			num: 123,
			str: "foo",
		});

		result.str = "modification";
		const result2 = await projectAsset.readAssetData();
		assert(result2.str != "modification", "readAssetData() should make a copy of the data");
	},
});

Deno.test({
	name: "readEmbeddedAssetData() throws if the asset is not an embedded asset",
	async fn() {
		const {projectAsset} = basicSetup();

		assertThrows(() => {
			projectAsset.readEmbeddedAssetData();
		}, Error, "Unable to read embeddedassetData, asset is not an embedded asset.");
	},
});

Deno.test({
	name: "writeEmbeddedAssetData() throws if the asset is not an embedded asset",
	async fn() {
		const {projectAsset} = basicSetup();

		assertThrows(() => {
			projectAsset.writeEmbeddedAssetData({
				num: 123,
				str: "foo",
			});
		}, Error, "Unable to write embeddedassetData, asset is not an embedded asset.");
	},
});

Deno.test({
	name: "writeEmbeddedAssetData() and then readEmbeddedAssetData() on an embedded asset",
	async fn() {
		const {projectAsset, mocks} = basicSetup({
			extraProjectAssetOpts: {
				isEmbedded: true,
				assetType: BASIC_PROJECTASSETTYPE,
				path: [],
			},
		});

		mocks.fileSystem.readFile = async () => {
			throw new AssertionError("embedded assets should not read from disk.");
		};
		mocks.fileSystem.writeFile = async () => {
			throw new AssertionError("embedded assets should not write to disk.");
		};

		const writeData = {
			num: 123,
			str: "foo",
		};

		projectAsset.writeEmbeddedAssetData(writeData);

		writeData.str = "modification";

		const result = projectAsset.readEmbeddedAssetData();
		assert(result.str != "modification", "writeAssetData() should make a copy of the data");
		assertEquals(result, {
			num: 123,
			str: "foo",
		});

		result.str = "modification";
		const result2 = projectAsset.readEmbeddedAssetData();
		assert(result2.str != "modification", "readAssetData() should make a copy of the data");
	},
});
