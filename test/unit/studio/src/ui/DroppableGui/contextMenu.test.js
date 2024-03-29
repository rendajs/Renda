import { assertEquals, assertExists } from "std/testing/asserts.ts";
import { assertContextMenuStructureEquals } from "../../../shared/contextMenuHelpers.js";
import { BASIC_ASSET_UUID, basicSetupForContextMenus, createMockDroppableProjectAsset, createMockProjectAssetType } from "./shared.js";

Deno.test({
	name: "context menu event creates a new context menu",
	async fn() {
		const { uninstall, createContextMenuCalls } = await basicSetupForContextMenus();

		try {
			assertExists(createContextMenuCalls[0]);
			assertContextMenuStructureEquals(createContextMenuCalls[0], [
				{ text: "Unlink" },
				{ text: "Copy Asset UUID" },
				{ text: "View Location" },
			]);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "context menu on a disabled gui",
	async fn() {
		const { uninstall, gui, createContextMenuCalls, dispatchContextMenuEvent } = await basicSetupForContextMenus({
			dispatchContextMenuEvent: false,
		});

		try {
			gui.setDisabled(true);
			await dispatchContextMenuEvent();

			assertExists(createContextMenuCalls[0]);
			assertContextMenuStructureEquals(createContextMenuCalls[0], [
				{ text: "Copy Asset UUID" },
				{ text: "View Location" },
			]);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "context menu without a value set",
	async fn() {
		const { uninstall, createContextMenuCalls } = await basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "none",
			},
		});

		try {
			assertEquals(createContextMenuCalls.length, 0);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "context menu with a value set and an available default value",
	async fn() {
		const { uninstall, createContextMenuCalls } = await basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "basic",
				guiOpts: {
					defaultValue: BASIC_ASSET_UUID,
				},
			},
		});

		try {
			assertExists(createContextMenuCalls[0]);
			await assertContextMenuStructureEquals(createContextMenuCalls[0], [
				{ text: "Reset to Default Value" },
				{ text: "Unlink" },
				{ text: "Copy Asset UUID" },
				{ text: "View Location" },
			]);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "context menu without a value set and an available default value",
	async fn() {
		const { uninstall, createContextMenuCalls } = await basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "none",
				guiOpts: {
					defaultValue: BASIC_ASSET_UUID,
				},
			},
		});

		try {
			assertExists(createContextMenuCalls[0]);
			await assertContextMenuStructureEquals(createContextMenuCalls[0], [{ text: "Reset to Default Value" }]);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "context menu without a value set and a disabled gui",
	async fn() {
		const { uninstall, gui, createContextMenuCalls, dispatchContextMenuEvent } = await basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "none",
			},
			dispatchContextMenuEvent: false,
		});

		try {
			gui.setDisabled(true);
			await dispatchContextMenuEvent();

			assertEquals(createContextMenuCalls.length, 0);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "context menu with a default asset link set",
	async fn() {
		const { uninstall, createContextMenuCalls } = await basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "defaultAssetLink",
			},
		});

		try {
			assertExists(createContextMenuCalls[0]);
			assertContextMenuStructureEquals(createContextMenuCalls[0], [
				{ text: "Unlink" },
				{ text: "Copy Asset UUID" },
				{ text: "Copy Resolved Asset Link Uuid" },
				{ text: "View Location" },
			]);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "context menu with embedded assets enabled and one supported asset type",
	async fn() {
		const mockParent = createMockDroppableProjectAsset();
		const { MockLiveAssetConstructor, ProjectAssetType } = createMockProjectAssetType();
		const { uninstall, createContextMenuCalls } = await basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "none",
				guiOpts: {
					supportedAssetTypes: [MockLiveAssetConstructor],
					embeddedParentAsset: mockParent,
				},
				liveAssetProjectAssetTypeCombinations: [[MockLiveAssetConstructor, [ProjectAssetType]]],
			},
		});

		try {
			assertExists(createContextMenuCalls[0]);
			assertContextMenuStructureEquals(createContextMenuCalls[0], [{ text: "Create Embedded Asset" }]);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "context menu with embedded assets enabled and two supported asset types",
	async fn() {
		const mockParent = createMockDroppableProjectAsset();
		const { MockLiveAssetConstructor: MockLiveAssetConstructor1, ProjectAssetType: ProjectAssetType1 } = createMockProjectAssetType({ type: "namespace1:type1", uiName: "Mock Live Asset 1" });
		const { MockLiveAssetConstructor: MockLiveAssetConstructor2, ProjectAssetType: ProjectAssetType2 } = createMockProjectAssetType({ type: "namespace2:type2", uiName: "Mock Live Asset 2" });
		const { uninstall, createContextMenuCalls } = await basicSetupForContextMenus({
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

		try {
			assertExists(createContextMenuCalls[0]);
			assertContextMenuStructureEquals(createContextMenuCalls[0], [
				{
					text: "Create Embedded Asset",
					submenu: [
						{ text: "Mock Live Asset 1" },
						{ text: "Mock Live Asset 2" },
					],
				},
			]);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "context menu with embedded assets disabled and two supported asset types",
	async fn() {
		const { MockLiveAssetConstructor: MockLiveAssetConstructor1, ProjectAssetType: ProjectAssetType1 } = createMockProjectAssetType({ type: "namespace1:type1", uiName: "Mock Live Asset 1" });
		const { MockLiveAssetConstructor: MockLiveAssetConstructor2, ProjectAssetType: ProjectAssetType2 } = createMockProjectAssetType({ type: "namespace2:type2", uiName: "" });
		const { uninstall, createContextMenuCalls } = await basicSetupForContextMenus({
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

		try {
			assertEquals(createContextMenuCalls.length, 0);
		} finally {
			uninstall();
		}
	},
});
