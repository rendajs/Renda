import {assertEquals, assertExists, assertStrictEquals} from "asserts";
import {triggerContextMenuItem} from "../../../shared/contextMenuHelpers.js";
import {basicSetupForContextMenus, createMockProjectAssetType} from "./shared.js";

Deno.test({
	name: "create embedded asset via context menu",
	async fn() {
		const {MockLiveAsset, ProjectAssetType} = createMockProjectAssetType();
		const {gui, uninstall, createContextMenuCalls} = basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "none",
				guiOpts: {
					supportedAssetTypes: [MockLiveAsset],
				},
				liveAssetProjectAssetTypeCombinations: [[MockLiveAsset, [ProjectAssetType]]],
			},
		});

		assertExists(createContextMenuCalls[0]);
		await triggerContextMenuItem(createContextMenuCalls[0], ["Create embedded asset"]);

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
		const {MockLiveAsset, ProjectAssetType} = createMockProjectAssetType();
		const {gui, uninstall, createContextMenuCalls, mockLiveAsset} = basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "none",
				guiOpts: {
					supportedAssetTypes: [MockLiveAsset],
				},
				liveAssetProjectAssetTypeCombinations: [[MockLiveAsset, [ProjectAssetType]]],
			},
		});

		const onValueChangePromise = new Promise(resolve => {
			gui.onValueChange(() => {
				const value = gui.getValue({returnLiveAsset: true});
				resolve(value);
			});
		});

		assertExists(createContextMenuCalls[0]);
		await triggerContextMenuItem(createContextMenuCalls[0], ["Create embedded asset"]);

		const promiseResult = await onValueChangePromise;

		assertExists(promiseResult);
		assertStrictEquals(promiseResult, mockLiveAsset);

		uninstall();
	},
});
