import {assertEquals, assertExists, assertStrictEquals} from "asserts";
import {assertSpyCall, assertSpyCalls} from "std/testing/mock";
import {triggerContextMenuItem} from "../../../shared/contextMenuHelpers.js";
import {basicSetupForContextMenus, createMockProjectAssetType} from "./shared.js";

const BASIC_PERSISTENCE_KEY = "persistenceKey";

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
				embeddedParentAssetPersistenceKey: BASIC_PERSISTENCE_KEY,
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
		const {gui, uninstall, triggerCreateEmbeddedAsset, createEmbeddedAssetSpy, MockProjectAssetType, mockParent} = basicSetupForEmbeddedAssets();

		await triggerCreateEmbeddedAsset();

		assertSpyCalls(createEmbeddedAssetSpy, 1);
		assertSpyCall(createEmbeddedAssetSpy, 0, {
			args: [MockProjectAssetType, mockParent, BASIC_PERSISTENCE_KEY],
		});
		assertStrictEquals(createEmbeddedAssetSpy.calls[0].args[0], MockProjectAssetType);
		assertStrictEquals(createEmbeddedAssetSpy.calls[0].args[1], mockParent);

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
	name: "removeEmbeddedAssetSupport() and setEmbeddedParentAsset()",
	async fn() {
		const {gui, uninstall, triggerCreateEmbeddedAsset, mockLiveAsset, createEmbeddedAssetSpy, MockProjectAssetType, mockParent} = basicSetupForEmbeddedAssets();

		await triggerCreateEmbeddedAsset();

		const liveAsset1 = gui.getValue({returnLiveAsset: true});
		assertStrictEquals(liveAsset1, mockLiveAsset);

		gui.removeEmbeddedAssetSupport();

		const value2 = gui.getValue();
		assertEquals(value2, null);

		const mockParent2 = createMockParentAsset();
		gui.setEmbeddedParentAsset(mockParent2, BASIC_PERSISTENCE_KEY);

		await triggerCreateEmbeddedAsset();

		const liveAsset2 = gui.getValue({returnLiveAsset: true});
		assertStrictEquals(liveAsset2, mockLiveAsset);

		assertSpyCalls(createEmbeddedAssetSpy, 2);
		assertSpyCall(createEmbeddedAssetSpy, 1, {
			args: [MockProjectAssetType, mockParent, BASIC_PERSISTENCE_KEY],
		});
		assertStrictEquals(createEmbeddedAssetSpy.calls[1].args[0], MockProjectAssetType);
		assertStrictEquals(createEmbeddedAssetSpy.calls[1].args[1], mockParent2);

		uninstall();
	},
});
