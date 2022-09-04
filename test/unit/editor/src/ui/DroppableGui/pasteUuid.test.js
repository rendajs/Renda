import {assertEquals, assertExists} from "std/testing/asserts.ts";
import {stub} from "std/testing/mock.ts";
import {assertContextMenuStructureContains, assertContextMenuStructureNotContainsText, triggerContextMenuItem} from "../../../shared/contextMenuHelpers.js";
import {basicSetupForContextMenus, createMockProjectAsset} from "./shared.js";
import {ClipboardEvent} from "fake-dom/FakeClipboardEvent.js";
import {waitForMicrotasks} from "../../../../shared/waitForMicroTasks.js";

const BASIC_PASTED_ASSET_UUID = "a75c1304-5347-4f86-ae7a-3f57c1fb3ebf";

/**
 * @param {object} options
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
		/**
		 * @param {string} clipboardData
		 */
		async dispatchPasteEvent(clipboardData) {
			const event = new ClipboardEvent("paste");
			event.clipboardData.setData("text/plain", clipboardData);
			returnValue.document.dispatchEvent(event);
			await waitForMicrotasks();
		},
		async triggerPasteShortcut() {
			await returnValue.triggerShortcutCommand("droppableGui.pasteUuid");
		},
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
		uninstall() {
			returnValue.uninstall();
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

Deno.test({
	name: "paste event, valid uuid",
	async fn() {
		const {gui, dispatchFocusEvent, dispatchPasteEvent, uninstall} = await basicSetupForPastingUuid();

		try {
			await dispatchFocusEvent(true);
			await dispatchPasteEvent(BASIC_PASTED_ASSET_UUID);
			const value = gui.getValue();
			assertEquals(value, BASIC_PASTED_ASSET_UUID);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "paste event, never had focus",
	async fn() {
		const {gui, dispatchPasteEvent, uninstall} = await basicSetupForPastingUuid();

		try {
			await dispatchPasteEvent(BASIC_PASTED_ASSET_UUID);
			const value = gui.getValue();
			assertEquals(value, null);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "paste event, focus removed",
	async fn() {
		const {gui, dispatchFocusEvent, dispatchPasteEvent, uninstall} = await basicSetupForPastingUuid();

		try {
			await dispatchFocusEvent(true);
			await dispatchFocusEvent(false);
			await dispatchPasteEvent(BASIC_PASTED_ASSET_UUID);
			const value = gui.getValue();
			assertEquals(value, null);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "paste event, empty string",
	async fn() {
		const {gui, dispatchFocusEvent, dispatchPasteEvent, uninstall} = await basicSetupForPastingUuid();

		try {
			await dispatchFocusEvent(true);
			await dispatchPasteEvent("");
			const value = gui.getValue();
			assertEquals(value, null);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "paste event, uuid not in the project",
	async fn() {
		const {gui, dispatchFocusEvent, dispatchPasteEvent, uninstall} = await basicSetupForPastingUuid();

		try {
			await dispatchFocusEvent(true);
			await dispatchPasteEvent("6b62e5c5-5cc7-4fef-9f43-83a0d99cd4e1");
			const value = gui.getValue();
			assertEquals(value, null);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "focus updates shortcut condition",
	async fn() {
		const {dispatchFocusEvent, getLastShortcutCondition, uninstall} = await basicSetupForPastingUuid();

		try {
			await dispatchFocusEvent(true);
			assertEquals(getLastShortcutCondition("droppableGui.focusSelected"), true);
			await dispatchFocusEvent(false);
			assertEquals(getLastShortcutCondition("droppableGui.focusSelected"), false);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "trigger shortcut command via shortcut manager",
	async fn() {
		const {gui, dispatchFocusEvent, triggerPasteShortcut, uninstall} = await basicSetupForPastingUuid();

		try {
			await dispatchFocusEvent(true);
			await triggerPasteShortcut();
			const value = gui.getValue();
			assertEquals(value, BASIC_PASTED_ASSET_UUID);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "trigger shortcut command via shortcut manager without focus",
	async fn() {
		const {gui, triggerPasteShortcut, uninstall} = await basicSetupForPastingUuid();

		try {
			await triggerPasteShortcut();
			const value = gui.getValue();
			assertEquals(value, null);
		} finally {
			uninstall();
		}
	},
});
