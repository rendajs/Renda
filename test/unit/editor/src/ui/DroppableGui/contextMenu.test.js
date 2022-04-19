import {assertEquals, assertExists} from "std/testing/asserts";
import {assertContextMenuStructureEquals} from "../../../shared/contextMenuHelpers.js";
import {basicSetupForContextMenus, createMockProjectAsset, createMockProjectAssetType} from "./shared.js";

Deno.test({
	name: "context menu event creates a new context menu",
	fn() {
		const {uninstall, createContextMenuCalls} = basicSetupForContextMenus();

		assertExists(createContextMenuCalls[0]);
		assertContextMenuStructureEquals(createContextMenuCalls[0], [
			{text: "Unlink"},
			{text: "Copy asset UUID"},
			{text: "View location"},
		]);

		uninstall();
	},
});

Deno.test({
	name: "context menu on a disabled gui",
	fn() {
		const {uninstall, gui, createContextMenuCalls, dispatchContextMenuEvent} = basicSetupForContextMenus({
			dispatchContextMenuEvent: false,
		});
		gui.setDisabled(true);
		dispatchContextMenuEvent();

		assertExists(createContextMenuCalls[0]);
		assertContextMenuStructureEquals(createContextMenuCalls[0], [
			{text: "Copy asset UUID"},
			{text: "View location"},
		]);

		uninstall();
	},
});

Deno.test({
	name: "context menu without a value set",
	fn() {
		const {uninstall, createContextMenuCalls} = basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "none",
			},
		});

		assertEquals(createContextMenuCalls.length, 0);

		uninstall();
	},
});

Deno.test({
	name: "context menu without a value set and a disabled gui",
	fn() {
		const {uninstall, gui, createContextMenuCalls, dispatchContextMenuEvent} = basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "none",
			},
			dispatchContextMenuEvent: false,
		});
		gui.setDisabled(true);
		dispatchContextMenuEvent();

		assertEquals(createContextMenuCalls.length, 0);

		uninstall();
	},
});

Deno.test({
	name: "context menu with a default asset link set",
	fn() {
		const {uninstall, createContextMenuCalls} = basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "defaultAssetLink",
			},
		});

		assertExists(createContextMenuCalls[0]);
		assertContextMenuStructureEquals(createContextMenuCalls[0], [
			{text: "Unlink"},
			{text: "Copy asset UUID"},
			{text: "Copy resolved asset link UUID"},
			{text: "View location"},
		]);

		uninstall();
	},
});

Deno.test({
	name: "context menu with embedded assets enabled and one supported asset type",
	fn() {
		const mockParent = createMockProjectAsset();
		const {MockLiveAssetConstructor, ProjectAssetType} = createMockProjectAssetType();
		const {uninstall, createContextMenuCalls} = basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "none",
				guiOpts: {
					supportedAssetTypes: [MockLiveAssetConstructor],
					embeddedParentAsset: mockParent,
				},
				liveAssetProjectAssetTypeCombinations: [[MockLiveAssetConstructor, [ProjectAssetType]]],
			},
		});

		assertExists(createContextMenuCalls[0]);
		assertContextMenuStructureEquals(createContextMenuCalls[0], [{text: "Create embedded asset"}]);

		uninstall();
	},
});

Deno.test({
	name: "context menu with embedded assets enabled and two supported asset types",
	fn() {
		const mockParent = createMockProjectAsset();
		const {MockLiveAssetConstructor: MockLiveAssetConstructor1, ProjectAssetType: ProjectAssetType1} = createMockProjectAssetType({type: "namespace1:type1", uiCreateName: "Mock Live Asset 1"});
		const {MockLiveAssetConstructor: MockLiveAssetConstructor2, ProjectAssetType: ProjectAssetType2} = createMockProjectAssetType({type: "namespace2:type2", uiCreateName: ""});
		const {uninstall, createContextMenuCalls} = basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "none",
				guiOpts: {
					supportedAssetTypes: [MockLiveAssetConstructor1, MockLiveAssetConstructor2],
					embeddedParentAsset: mockParent,
				},
				liveAssetProjectAssetTypeCombinations: [
					[MockLiveAssetConstructor1, [ProjectAssetType1]],
					[MockLiveAssetConstructor2, [ProjectAssetType2]],
				],
			},
		});

		assertExists(createContextMenuCalls[0]);
		assertContextMenuStructureEquals(createContextMenuCalls[0], [
			{
				text: "Create embedded asset",
				submenu: [
					{text: "Mock Live Asset 1"},
					{text: "<namespace2:type2>"},
				],
			},
		]);

		uninstall();
	},
});

Deno.test({
	name: "context menu with embedded assets disabled and two supported asset types",
	fn() {
		const {MockLiveAssetConstructor: MockLiveAssetConstructor1, ProjectAssetType: ProjectAssetType1} = createMockProjectAssetType({type: "namespace1:type1", uiCreateName: "Mock Live Asset 1"});
		const {MockLiveAssetConstructor: MockLiveAssetConstructor2, ProjectAssetType: ProjectAssetType2} = createMockProjectAssetType({type: "namespace2:type2", uiCreateName: ""});
		const {uninstall, createContextMenuCalls} = basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "none",
				guiOpts: {
					supportedAssetTypes: [MockLiveAssetConstructor1, MockLiveAssetConstructor2],
				},
				liveAssetProjectAssetTypeCombinations: [
					[MockLiveAssetConstructor1, [ProjectAssetType1]],
					[MockLiveAssetConstructor2, [ProjectAssetType2]],
				],
			},
		});

		assertEquals(createContextMenuCalls.length, 0);

		uninstall();
	},
});
