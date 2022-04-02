import {assertEquals, assertExists, assertStrictEquals} from "asserts";
import {FakeMouseEvent} from "../../../../../../.denoTypes/urlImports/https_/raw.githubusercontent.com/jespertheend/fake-dom/main/src/FakeMouseEvent.js";
import {triggerContextMenuItem} from "../../../shared/contextMenuHelpers.js";
import {basicSetupForContextMenus, createBasicGui} from "./shared.js";

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
