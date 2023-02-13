import {assertEquals, assertInstanceOf, assertRejects, assertStrictEquals} from "std/testing/asserts.ts";
import {UNKNOWN_ASSET_EXTENSION, basicSetup} from "./shared.js";
import {assertSpyCalls, spy} from "std/testing/mock.ts";

Deno.test({
	name: "getLiveAssetData throws if the asset doesn't have an ProjectAssetType set",
	async fn() {
		const {projectAsset, uninstall} = basicSetup({isKnownAssetType: false});

		try {
			await assertRejects(async () => {
				await projectAsset.getLiveAssetData();
			}, Error, `Failed to get live asset data for asset at "path/to/asset.${UNKNOWN_ASSET_EXTENSION}" because the asset type couldn't be determined. Make sure your asset type is registered in the ProjectAssetTypeManager.`);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "getLiveAssetData() returns the asset data",
	async fn() {
		const {projectAsset, mocks, uninstall} = basicSetup();

		try {
			const liveAssetData = await projectAsset.getLiveAssetData();
			assertInstanceOf(liveAssetData.liveAsset, mocks.MockProjectAssetTypeLiveAsset);
			assertEquals(liveAssetData.liveAsset.num, 42);
			assertEquals(liveAssetData.liveAsset.str, "defaultBasicAssetDiskString");
			assertEquals(liveAssetData.studioData, {
				studioNum: 42,
				studioStr: "defaultMockLiveAssetEditorStr",
			});
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "getLiveAssetData() returns existing data if it's already been loaded",
	async fn() {
		const {projectAsset, uninstall} = basicSetup();

		try {
			const liveAssetData1 = await projectAsset.getLiveAssetData();
			const liveAssetData2 = await projectAsset.getLiveAssetData();
			assertStrictEquals(liveAssetData1.liveAsset, liveAssetData2.liveAsset);
			assertStrictEquals(liveAssetData1.studioData, liveAssetData2.studioData);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "getLiveAssetData() returns existing data if it is currently being loaded",
	async fn() {
		const {projectAsset, uninstall} = basicSetup();

		try {
			const promise1 = projectAsset.getLiveAssetData();
			const promise2 = projectAsset.getLiveAssetData();
			const liveAssetData1 = await promise1;
			const liveAssetData2 = await promise2;
			assertStrictEquals(liveAssetData1.liveAsset, liveAssetData2.liveAsset);
			assertStrictEquals(liveAssetData1.studioData, liveAssetData2.studioData);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "onLiveAssetDataChange()",
	async fn() {
		const {projectAsset, uninstall} = basicSetup();
		try {
			/** @type {import("std/testing/mock.ts").Spy<any, [import("../../../../../../studio/src/assets/projectAssetType/ProjectAssetType.js").LiveAssetDataAny], void>} */
			const dataChangeSpy = spy();
			projectAsset.onLiveAssetDataChange(dataChangeSpy);

			const liveAssetData = await projectAsset.getLiveAssetData();
			assertSpyCalls(dataChangeSpy, 1);
			assertStrictEquals(dataChangeSpy.calls[0].args[0].liveAsset, liveAssetData.liveAsset);
			assertStrictEquals(dataChangeSpy.calls[0].args[0].studioData, liveAssetData.studioData);

			projectAsset.destroyLiveAssetData();

			const liveAssetData2 = await projectAsset.getLiveAssetData();
			assertSpyCalls(dataChangeSpy, 2);
			assertStrictEquals(dataChangeSpy.calls[1].args[0].liveAsset, liveAssetData2.liveAsset);
			assertStrictEquals(dataChangeSpy.calls[1].args[0].studioData, liveAssetData2.studioData);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "onLiveAssetDataChange() doesn't fire when removed",
	async fn() {
		const {projectAsset, uninstall} = basicSetup();
		try {
			let callbackCalled = false;
			const cb = () => {
				callbackCalled = true;
			};
			projectAsset.onLiveAssetDataChange(cb);
			projectAsset.removeOnLiveAssetDataChange(cb);

			await projectAsset.getLiveAssetData();

			assertEquals(callbackCalled, false);
		} finally {
			await uninstall();
		}
	},
});

Deno.test({
	name: "destroyLiveAssetData() rejects existing pending getLiveAssetData() promises",
	async fn() {
		const {projectAsset, mocks, uninstall} = basicSetup();

		try {
			// At the moment, the first call does resolve because while loading the call to
			// destroyLiveAssetData is detected and the loading essentially restarts.
			// In the future we might want to make sure the second pomise resolves as well.
			// But for now we'll make sure at least it rejects.
			const promise1 = projectAsset.getLiveAssetData();
			const promise2 = projectAsset.getLiveAssetData();

			projectAsset.destroyLiveAssetData();

			await assertRejects(async () => {
				await promise2;
			}, Error, "The live asset was destroyed before it finished loading.");

			const promiseResult1 = await promise1;
			assertInstanceOf(promiseResult1.liveAsset, mocks.MockProjectAssetTypeLiveAsset);
			assertEquals(promiseResult1.liveAsset.num, 42);
			assertEquals(promiseResult1.liveAsset.str, "defaultBasicAssetDiskString");
			assertEquals(promiseResult1.studioData, {
				studioNum: 42,
				studioStr: "defaultMockLiveAssetEditorStr",
			});
		} finally {
			await uninstall();
		}
	},
});
