import {assertEquals, assertExists, assertStrictEquals} from "asserts";
import {triggerContextMenuItem} from "../../../shared/contextMenuHelpers.js";
import {basicSetupForContextMenus, createMockProjectAssetType} from "./shared.js";

function createMockParentAsset() {
	const projectAsset = /** @type {import("../../../../../../editor/src/assets/ProjectAsset.js").ProjectAssetAny} */ ({});
	return projectAsset;
}

function basicSetupForEmbeddedAssets() {
	const mockParent = createMockParentAsset();
	const {MockLiveAsset, ProjectAssetType} = createMockProjectAssetType();
	const returnValue = basicSetupForContextMenus({
		basicGuiOptions: {
			valueType: "none",
			guiOpts: {
				supportedAssetTypes: [MockLiveAsset],
				embeddedParentAsset: mockParent,
			},
			liveAssetProjectAssetTypeCombinations: [[MockLiveAsset, [ProjectAssetType]]],
		},
		dispatchContextMenuEvent: false,
	});
	return {
		...returnValue,
		async triggerCreateEmbeddedAsset() {
			returnValue.dispatchContextMenuEvent();
			const lastCall = returnValue.createContextMenuCalls[returnValue.createContextMenuCalls.length - 1];
			assertExists(lastCall);
			await triggerContextMenuItem(lastCall, ["Create embedded asset"]);
		},
		MockProjectAssetType: ProjectAssetType,
		mockParent,
	};
}

Deno.test({
	name: "create embedded asset via context menu",
	async fn() {
		const {gui, uninstall, triggerCreateEmbeddedAsset, createEmbeddedAssetCalls, MockProjectAssetType, mockParent} = basicSetupForEmbeddedAssets();

		await triggerCreateEmbeddedAsset();

		assertEquals(createEmbeddedAssetCalls, [
			{
				assetType: MockProjectAssetType,
				parent: mockParent,
			},
		]);
		assertStrictEquals(createEmbeddedAssetCalls[0].assetType, MockProjectAssetType);
		assertStrictEquals(createEmbeddedAssetCalls[0].parent, mockParent);

		assertExists(gui.projectAssetValue);
		assertEquals(gui.defaultAssetLink, null);
		assertEquals(gui.defaultAssetLinkUuid, null);
		assertEquals(gui.visibleAssetName, "Embedded asset");

		uninstall();
	},
});

Deno.test({
	name: "creating embedded assets waits with firing the onChange event until the live asset is loaded",
	async fn() {
		const {gui, uninstall, triggerCreateEmbeddedAsset, mockLiveAsset} = basicSetupForEmbeddedAssets();

		const onValueChangePromise = new Promise(resolve => {
			gui.onValueChange(() => {
				const value = gui.getValue({returnLiveAsset: true});
				resolve(value);
			});
		});

		await triggerCreateEmbeddedAsset();

		const promiseResult = await onValueChangePromise;

		assertExists(promiseResult);
		assertStrictEquals(promiseResult, mockLiveAsset);

		uninstall();
	},
});

Deno.test({
	name: "setEmbeddedParentAsset()",
	async fn() {
		const {gui, uninstall, triggerCreateEmbeddedAsset, mockLiveAsset, createEmbeddedAssetCalls, MockProjectAssetType, mockParent} = basicSetupForEmbeddedAssets();

		await triggerCreateEmbeddedAsset();

		const liveAsset1 = gui.getValue({returnLiveAsset: true});
		assertStrictEquals(liveAsset1, mockLiveAsset);

		gui.setEmbeddedParentAsset(null);

		const value2 = gui.getValue();
		assertEquals(value2, null);

		const mockParent2 = createMockParentAsset();
		gui.setEmbeddedParentAsset(mockParent2);

		await triggerCreateEmbeddedAsset();

		const liveAsset2 = gui.getValue({returnLiveAsset: true});
		assertStrictEquals(liveAsset2, mockLiveAsset);

		assertEquals(createEmbeddedAssetCalls, [
			{
				assetType: MockProjectAssetType,
				parent: mockParent,
			},
			{
				assetType: MockProjectAssetType,
				parent: mockParent2,
			},
		]);
		assertStrictEquals(createEmbeddedAssetCalls[1].assetType, MockProjectAssetType);
		assertStrictEquals(createEmbeddedAssetCalls[1].parent, mockParent2);

		uninstall();
	},
});
