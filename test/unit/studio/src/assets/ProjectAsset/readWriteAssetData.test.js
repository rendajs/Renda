import {assertEquals} from "std/testing/asserts.ts";
import {BASIC_PROJECTASSETTYPE, basicSetup} from "./shared.js";

Deno.test({
	name: "json with metadata",
	async fn() {
		const {projectAsset, mocks: {fileSystem}, uninstall} = basicSetup({
			extraProjectAssetOpts: {
				assetType: BASIC_PROJECTASSETTYPE,
				path: ["path", "to", "asset"],
			},
		});

		try {
			await projectAsset.writeAssetData({num: 123, str: "foo"});
			const rawFileData = await fileSystem.readJson(["path", "to", "asset"]);
			assertEquals(rawFileData, {
				assetType: BASIC_PROJECTASSETTYPE,
				asset: {
					num: 123,
					str: "foo",
				},
			});

			const readResult = await projectAsset.readAssetData();
			assertEquals(readResult, {
				num: 123,
				str: "foo",
			});
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "json with metadata, empty object",
	async fn() {
		const {projectAsset, mocks: {fileSystem}, uninstall} = basicSetup({
			extraProjectAssetOpts: {
				assetType: BASIC_PROJECTASSETTYPE,
				path: ["path", "to", "asset"],
			},
		});

		try {
			await projectAsset.writeAssetData({});
			const rawFileData = await fileSystem.readJson(["path", "to", "asset"]);
			assertEquals(rawFileData, {
				assetType: BASIC_PROJECTASSETTYPE,
				asset: {},
			});

			const readResult = await projectAsset.readAssetData();
			assertEquals(readResult, {});
		} finally {
			await uninstall();
		}
	},
});
