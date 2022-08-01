import {assertEquals, assertExists, assertStrictEquals} from "std/testing/asserts.ts";
import {FakeMouseEvent} from "fake-dom/FakeMouseEvent.js";
import {triggerContextMenuItem} from "../../../shared/contextMenuHelpers.js";
import {BASIC_ASSET_UUID, basicSetupForContextMenus, createBasicGui} from "./shared.js";

Deno.test({
	name: "Is not disabled by default",
	fn() {
		const {gui, uninstall} = createBasicGui();

		assertEquals(gui.disabled, false);
		assertEquals(gui.el.getAttribute("aria-disabled"), "false");

		uninstall();
	},
});

Deno.test({
	name: "unlink via context menu",
	async fn() {
		const {uninstall, gui, createContextMenuCalls} = basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "defaultAssetLink",
			},
		});

		assertExists(createContextMenuCalls[0]);
		await triggerContextMenuItem(createContextMenuCalls[0], ["Unlink"]);

		assertEquals(gui.projectAssetValue, null);
		assertEquals(gui.defaultAssetLink, null);
		assertEquals(gui.defaultAssetLinkUuid, null);

		uninstall();
	},
});

Deno.test({
	name: "double clicking opens the project asset",
	async fn() {
		const {gui, mockProjectAsset, mockWindowManager, uninstall} = createBasicGui();

		/** @type {unknown[][]} */
		const openCalls = [];
		mockProjectAsset.open = async (...args) => {
			openCalls.push(args);
		};
		gui.setValue(mockProjectAsset);

		gui.el.dispatchEvent(new FakeMouseEvent("dblclick"));

		assertEquals(openCalls, [[mockWindowManager]]);
		assertStrictEquals(openCalls[0][0], mockWindowManager);

		uninstall();
	},
});

Deno.test({
	name: "Resetting to default value via context menu",
	async fn() {
		const {uninstall, gui, createContextMenuCalls, mockProjectAsset} = basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "none",
				guiOpts: {
					defaultValue: BASIC_ASSET_UUID,
				},
			},
		});

		try {
			assertExists(createContextMenuCalls[0]);
			await triggerContextMenuItem(createContextMenuCalls[0], ["Reset to default value"]);

			assertStrictEquals(gui.projectAssetValue, mockProjectAsset);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Doesn't trigger change events until live asset has been preloaded when resetting",
	async fn() {
		const {uninstall, gui, createContextMenuCalls} = basicSetupForContextMenus({
			basicGuiOptions: {
				valueType: "none",
				guiOpts: {
					defaultValue: BASIC_ASSET_UUID,
				},
			},
		});

		try {
			/** @type {Promise<void>} */
			const onChangePromise = new Promise(resolve => {
				gui.onValueChange(() => {
					resolve();
				});
			});
			assertExists(createContextMenuCalls[0]);
			await triggerContextMenuItem(createContextMenuCalls[0], ["Reset to default value"]);
			await onChangePromise;
			const value = gui.getValue({returnLiveAsset: true});
			assertExists(value);
		} finally {
			uninstall();
		}
	},
});
