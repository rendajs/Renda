import {assertEquals, assertExists} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {createOnChangeEventSpy} from "../shared.js";
import {BASIC_ASSET_UUID_FOR_SETTING, basicSetupForSettingByUuid} from "./shared.js";

Deno.test({
	name: "paste uuid via context menu",
	async fn() {
		const {gui, dispatchContextMenuEvent, assertContextMenu, clickPaste, uninstall} = await basicSetupForSettingByUuid();

		try {
			const onChangeSpy = createOnChangeEventSpy(gui);

			await dispatchContextMenuEvent();
			await assertContextMenu(true);
			await clickPaste();
			const value = gui.getValue();
			assertEquals(value, BASIC_ASSET_UUID_FOR_SETTING);

			assertSpyCalls(onChangeSpy, 1);
			assertSpyCall(onChangeSpy, 0, {
				args: [
					{
						value: BASIC_ASSET_UUID_FOR_SETTING,
						trigger: "user",
					},
				],
			});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "paste via context menu, paste permission denied",
	async fn() {
		const {dispatchContextMenuEvent, assertContextMenu, uninstall} = await basicSetupForSettingByUuid({
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
		const {dispatchContextMenuEvent, assertContextMenu, uninstall} = await basicSetupForSettingByUuid({
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
		const {dispatchContextMenuEvent, assertContextMenu, uninstall} = await basicSetupForSettingByUuid({
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
		const {dispatchContextMenuEvent, assertContextMenu, uninstall} = await basicSetupForSettingByUuid({
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
	name: "paste via context menu, valid asset type, one supported",
	async fn() {
		const {dispatchContextMenuEvent, assertContextMenu, uninstall} = await basicSetupForSettingByUuid({
			clipboardAsset: BASIC_ASSET_UUID_FOR_SETTING,
			supportedAssetTypes: ["type1"],
			includeMockProjectAssetTypeAsSupported: true,
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
	name: "paste via context menu, invalid asset type, one supported",
	async fn() {
		const {dispatchContextMenuEvent, assertContextMenu, uninstall} = await basicSetupForSettingByUuid({
			clipboardAsset: BASIC_ASSET_UUID_FOR_SETTING,
			supportedAssetTypes: ["type1"],
		});

		try {
			await dispatchContextMenuEvent();
			await assertContextMenu(true, true, `The asset UUID in your clipboard has an invalid type. Was "pasted asset type" but expected "type1".`);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "paste via context menu, invalid asset type, two supported",
	async fn() {
		const {dispatchContextMenuEvent, assertContextMenu, uninstall} = await basicSetupForSettingByUuid({
			clipboardAsset: BASIC_ASSET_UUID_FOR_SETTING,
			supportedAssetTypes: ["type1", "type2"],
		});

		try {
			await dispatchContextMenuEvent();
			await assertContextMenu(true, true, `The asset UUID in your clipboard has an invalid type. Was "pasted asset type" but expected "type1" or "type2".`);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "paste via context menu, invalid asset type, three supported",
	async fn() {
		const {dispatchContextMenuEvent, assertContextMenu, uninstall} = await basicSetupForSettingByUuid({
			clipboardAsset: BASIC_ASSET_UUID_FOR_SETTING,
			supportedAssetTypes: ["type1", "type2", "type3"],
		});

		try {
			await dispatchContextMenuEvent();
			await assertContextMenu(true, true, `The asset UUID in your clipboard has an invalid type. Was "pasted asset type" but expected "type1", "type2" or "type3".`);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "paste via context menu, invalid asset type, four supported",
	async fn() {
		const {dispatchContextMenuEvent, assertContextMenu, uninstall} = await basicSetupForSettingByUuid({
			clipboardAsset: BASIC_ASSET_UUID_FOR_SETTING,
			supportedAssetTypes: ["type1", "type2", "type3", "type4"],
		});

		try {
			await dispatchContextMenuEvent();
			await assertContextMenu(true, true, `The asset UUID in your clipboard has an invalid type. Was "pasted asset type" but expected "type1", "type2", "type3" or "type4".`);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "paste uuid via context menu makes asset uuid persistent",
	ignore: true,
	async fn() {
		const {mockStudio, dispatchContextMenuEvent, gui, assertContextMenu, clickPaste, mockProjectAsset, uninstall} = await basicSetupForSettingByUuid();

		try {
			const assetManager = mockStudio.projectManager.assetManager;
			assertExists(assetManager);
			const makePersistentSpy = spy(assetManager, "makeAssetUuidPersistent");
			const onChangeSpy = createOnChangeEventSpy(gui);

			await dispatchContextMenuEvent();
			await assertContextMenu(true);
			await clickPaste();

			assertSpyCalls(makePersistentSpy, 1);
			assertSpyCall(makePersistentSpy, 0, {
				args: [mockProjectAsset],
			});

			assertSpyCalls(onChangeSpy, 1);
			assertSpyCall(onChangeSpy, 0, {
				args: [
					{
						value: BASIC_ASSET_UUID_FOR_SETTING,
						trigger: "user",
					},
				],
			});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "paste event, valid uuid",
	async fn() {
		const {gui, dispatchFocusEvent, dispatchPasteEvent, uninstall} = await basicSetupForSettingByUuid();

		try {
			const onChangeSpy = createOnChangeEventSpy(gui);

			await dispatchFocusEvent(true);
			await dispatchPasteEvent(BASIC_ASSET_UUID_FOR_SETTING);
			const value = gui.getValue();
			assertEquals(value, BASIC_ASSET_UUID_FOR_SETTING);

			assertSpyCalls(onChangeSpy, 1);
			assertSpyCall(onChangeSpy, 0, {
				args: [
					{
						value: BASIC_ASSET_UUID_FOR_SETTING,
						trigger: "user",
					},
				],
			});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "paste event, never had focus",
	async fn() {
		const {gui, dispatchPasteEvent, uninstall} = await basicSetupForSettingByUuid();

		try {
			const onChangeSpy = createOnChangeEventSpy(gui);

			await dispatchPasteEvent(BASIC_ASSET_UUID_FOR_SETTING);

			const value = gui.getValue();
			assertEquals(value, null);
			assertSpyCalls(onChangeSpy, 0);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "paste event, focus removed",
	async fn() {
		const {gui, dispatchFocusEvent, dispatchPasteEvent, uninstall} = await basicSetupForSettingByUuid();

		try {
			const onChangeSpy = createOnChangeEventSpy(gui);

			await dispatchFocusEvent(true);
			await dispatchFocusEvent(false);
			await dispatchPasteEvent(BASIC_ASSET_UUID_FOR_SETTING);

			const value = gui.getValue();
			assertEquals(value, null);
			assertSpyCalls(onChangeSpy, 0);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "paste event, empty string",
	async fn() {
		const {gui, dispatchFocusEvent, dispatchPasteEvent, uninstall} = await basicSetupForSettingByUuid();

		try {
			const onChangeSpy = createOnChangeEventSpy(gui);

			await dispatchFocusEvent(true);
			await dispatchPasteEvent("");

			const value = gui.getValue();
			assertEquals(value, null);
			assertSpyCalls(onChangeSpy, 0);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "paste event, uuid not in the project",
	async fn() {
		const {gui, dispatchFocusEvent, dispatchPasteEvent, uninstall} = await basicSetupForSettingByUuid();

		try {
			const onChangeSpy = createOnChangeEventSpy(gui);

			await dispatchFocusEvent(true);
			await dispatchPasteEvent("6b62e5c5-5cc7-4fef-9f43-83a0d99cd4e1");

			const value = gui.getValue();
			assertEquals(value, null);
			assertSpyCalls(onChangeSpy, 0);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "paste event, invalid asset type",
	async fn() {
		const {gui, dispatchFocusEvent, dispatchPasteEvent, uninstall} = await basicSetupForSettingByUuid({
			clipboardAsset: BASIC_ASSET_UUID_FOR_SETTING,
			supportedAssetTypes: ["type1"],
		});

		try {
			const onChangeSpy = createOnChangeEventSpy(gui);

			await dispatchFocusEvent(true);
			await dispatchPasteEvent(BASIC_ASSET_UUID_FOR_SETTING);

			const value = gui.getValue();
			assertEquals(value, null);
			assertSpyCalls(onChangeSpy, 0);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "paste event, valid asset type",
	async fn() {
		const {gui, dispatchFocusEvent, dispatchPasteEvent, uninstall} = await basicSetupForSettingByUuid({
			clipboardAsset: BASIC_ASSET_UUID_FOR_SETTING,
			supportedAssetTypes: ["type1"],
			includeMockProjectAssetTypeAsSupported: true,
		});

		try {
			const onChangeSpy = createOnChangeEventSpy(gui);

			await dispatchFocusEvent(true);
			await dispatchPasteEvent(BASIC_ASSET_UUID_FOR_SETTING);

			const value = gui.getValue();
			assertEquals(value, BASIC_ASSET_UUID_FOR_SETTING);
			assertSpyCalls(onChangeSpy, 1);
			assertSpyCall(onChangeSpy, 0, {
				args: [
					{
						value: BASIC_ASSET_UUID_FOR_SETTING,
						trigger: "user",
					},
				],
			});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "focus updates shortcut condition",
	async fn() {
		const {dispatchFocusEvent, getLastShortcutCondition, uninstall} = await basicSetupForSettingByUuid();

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
		const {gui, dispatchFocusEvent, triggerPasteShortcut, uninstall} = await basicSetupForSettingByUuid();

		try {
			const onChangeSpy = createOnChangeEventSpy(gui);

			await dispatchFocusEvent(true);
			await triggerPasteShortcut();

			const value = gui.getValue();
			assertEquals(value, BASIC_ASSET_UUID_FOR_SETTING);
			assertSpyCalls(onChangeSpy, 1);
			assertSpyCall(onChangeSpy, 0, {
				args: [
					{
						value: BASIC_ASSET_UUID_FOR_SETTING,
						trigger: "user",
					},
				],
			});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "trigger shortcut command via shortcut manager without focus",
	async fn() {
		const {gui, triggerPasteShortcut, uninstall} = await basicSetupForSettingByUuid();

		try {
			const onChangeSpy = createOnChangeEventSpy(gui);

			await triggerPasteShortcut();

			const value = gui.getValue();
			assertEquals(value, null);
			assertSpyCalls(onChangeSpy, 0);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "trigger shortcut command via shortcut manager, invalid asset type",
	async fn() {
		const {gui, dispatchFocusEvent, triggerPasteShortcut, uninstall} = await basicSetupForSettingByUuid({
			clipboardAsset: BASIC_ASSET_UUID_FOR_SETTING,
			supportedAssetTypes: ["type1"],
		});

		try {
			const onChangeSpy = createOnChangeEventSpy(gui);

			await dispatchFocusEvent(true);
			await triggerPasteShortcut();

			const value = gui.getValue();
			assertEquals(value, null);
			assertSpyCalls(onChangeSpy, 0);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "trigger shortcut command via shortcut manager, valid asset type with supported list",
	async fn() {
		const {gui, dispatchFocusEvent, triggerPasteShortcut, uninstall} = await basicSetupForSettingByUuid({
			clipboardAsset: BASIC_ASSET_UUID_FOR_SETTING,
			supportedAssetTypes: ["type1"],
			includeMockProjectAssetTypeAsSupported: true,
		});

		try {
			const onChangeSpy = createOnChangeEventSpy(gui);

			await dispatchFocusEvent(true);
			await triggerPasteShortcut();

			const value = gui.getValue();
			assertEquals(value, BASIC_ASSET_UUID_FOR_SETTING);
			assertSpyCalls(onChangeSpy, 1);
			assertSpyCall(onChangeSpy, 0, {
				args: [
					{
						value: BASIC_ASSET_UUID_FOR_SETTING,
						trigger: "user",
					},
				],
			});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "paste event makes asset uuid persistent",
	ignore: true,
	async fn() {
		const {mockStudio, dispatchFocusEvent, dispatchPasteEvent, mockProjectAsset, uninstall} = await basicSetupForSettingByUuid();

		try {
			const assetManager = mockStudio.projectManager.assetManager;
			assertExists(assetManager);
			const makePersistentSpy = spy(assetManager, "makeAssetUuidPersistent");

			await dispatchFocusEvent(true);
			await dispatchPasteEvent(BASIC_ASSET_UUID_FOR_SETTING);
			assertSpyCalls(makePersistentSpy, 1);
			assertSpyCall(makePersistentSpy, 0, {
				args: [mockProjectAsset],
			});
		} finally {
			uninstall();
		}
	},
});
