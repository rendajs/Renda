import {assertEquals, assertInstanceOf, assertRejects, assertStrictEquals} from "asserts";
import {UNKNOWN_ASSET_EXTENSION, basicSetup} from "./shared.js";

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
		assertEquals(liveAssetData.liveAsset.str, "defaultBasicAssetDiskString");
		assertEquals(liveAssetData.editorData, {
			editorNum: 42,
			editorStr: "defaultMockLiveAssetEditorStr",
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
		/** @type {import("../../../../../../editor/src/assets/projectAssetType/ProjectAssetType.js").LiveAssetDataAny[]} */
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
