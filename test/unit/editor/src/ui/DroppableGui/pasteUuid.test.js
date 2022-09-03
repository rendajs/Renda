import {assertEquals, assertExists} from "std/testing/asserts.ts";
import {stub} from "std/testing/mock.ts";
import {assertContextMenuStructureContains, assertContextMenuStructureNotContainsText, triggerContextMenuItem} from "../../../shared/contextMenuHelpers.js";
import {basicSetupForContextMenus, createMockProjectAsset} from "./shared.js";

const BASIC_PASTED_ASSET_UUID = "a75c1304-5347-4f86-ae7a-3f57c1fb3ebf";

/**
 * @param {Object} options
 * @param {string} [options.clipboardAsset] The content that is currently in the clipboard
 * @param {PermissionState} [options.clipboardReadPermissionState] The content that is currently in the clipboard
 */
async function basicSetupForPastingUuid({
	clipboardAsset = BASIC_PASTED_ASSET_UUID,
	clipboardReadPermissionState = "granted",
} = {}) {
	const returnValue = await basicSetupForContextMenus({
		basicGuiOptions: {
			clipboardReadTextReturn: clipboardAsset,
			clipboardReadPermissionState,
			valueType: "none",
		},
		dispatchContextMenuEvent: false,
	});

	const assetManager = returnValue.mockEditor.projectManager.assetManager;
	assertExists(assetManager);
	stub(assetManager, "hasProjectAssetUuid", async uuid => {
		return uuid == BASIC_PASTED_ASSET_UUID;
	});

	const mockProjectAsset = createMockProjectAsset({
		uuid: BASIC_PASTED_ASSET_UUID,
	});
	returnValue.addMockProjectAsset(BASIC_PASTED_ASSET_UUID, mockProjectAsset);

	return {
		...returnValue,
		async dispatchContextMenuEvent() {
			await returnValue.dispatchContextMenuEvent();
		},
		/**
		 * @param {boolean} visible
		 */
		async assertContextMenu(visible, disabled = false, tooltip = "") {
			const {createContextMenuCalls} = returnValue;
			const call = createContextMenuCalls[0];
			const itemText = "Paste asset UUID";
			if (visible) {
				assertExists(call);
				await assertContextMenuStructureContains(call, {
					text: itemText,
					disabled,
					tooltip,
				});
			} else {
				if (call) {
					await assertContextMenuStructureNotContainsText(call, "Paste asset UUID");
				}
			}
		},
		async clickPaste() {
			const {createContextMenuCalls} = returnValue;
			assertExists(createContextMenuCalls[0]);
			await triggerContextMenuItem(createContextMenuCalls[0], ["Paste asset UUID"]);
		},
	};
}

Deno.test({
	name: "paste uuid via context menu",
	async fn() {
		const {gui, dispatchContextMenuEvent, assertContextMenu, clickPaste, uninstall} = await basicSetupForPastingUuid();

		try {
			await dispatchContextMenuEvent();
			await assertContextMenu(true);
			await clickPaste();
			const value = gui.getValue();
			assertEquals(value, BASIC_PASTED_ASSET_UUID);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "paste via context menu, paste permission denied",
	async fn() {
		const {dispatchContextMenuEvent, assertContextMenu, uninstall} = await basicSetupForPastingUuid({
			clipboardReadPermissionState: "denied",
		});

		try {
			await dispatchContextMenuEvent();
			await assertContextMenu(true, true, "You have disabled clipboard access. Check the permissions in your browser settings.");
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "paste via context menu, permission is prompt",
	async fn() {
		const {dispatchContextMenuEvent, assertContextMenu, uninstall} = await basicSetupForPastingUuid({
			clipboardReadPermissionState: "prompt",
		});

		try {
			await dispatchContextMenuEvent();
			await assertContextMenu(true);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "paste via context menu, clipboard contains no uuid",
	async fn() {
		const {dispatchContextMenuEvent, assertContextMenu, uninstall} = await basicSetupForPastingUuid({
			clipboardAsset: "not an uuid",
		});

		try {
			await dispatchContextMenuEvent();
			await assertContextMenu(false);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "paste via context menu, asset uuid not in project",
	async fn() {
		const {dispatchContextMenuEvent, assertContextMenu, uninstall} = await basicSetupForPastingUuid({
			clipboardAsset: "ac6364f9-65f3-479e-9d7b-266a1ca22ff7",
		});

		try {
			await dispatchContextMenuEvent();
			await assertContextMenu(true, true, "The asset UUID in your clipboard is not an asset in this project.");
		} finally {
			uninstall();
		}
	},
});
