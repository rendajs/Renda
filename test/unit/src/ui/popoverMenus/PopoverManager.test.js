import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {FakeMouseEvent} from "fake-dom/FakeMouseEvent.js";
import {assertEquals, assertExists, assertStrictEquals, assertThrows} from "std/testing/asserts.ts";
import {PopoverManager} from "../../../../../editor/src/ui/popoverMenus/PopoverManager.js";
import {ColorizerFilterManager} from "../../../../../editor/src/util/colorizerFilters/ColorizerFilterManager.js";

function basicManager() {
	installFakeDocument();
	const colorizerFilterManager = new ColorizerFilterManager();
	const manager = new PopoverManager(colorizerFilterManager);
	return {
		manager,
		uninstall() {
			uninstallFakeDocument();
		},
	};
}

Deno.test({
	name: "popover creation",
	fn() {
		const {manager, uninstall} = basicManager();
		try {
			assertEquals(manager.curtainEl.parentElement, null);

			const popover = manager.createPopover();
			assertExists(manager.curtainEl.parentElement);
			assertStrictEquals(manager.current, popover);
			assertEquals(manager.currentContextMenu, null);

			assertThrows(() => {
				manager.createPopover();
			}, Error, "Cannot create a popover while one is already open.");

			const mouseEvent = new FakeMouseEvent("click");
			manager.curtainEl.dispatchEvent(mouseEvent);
			assertEquals(manager.curtainEl.parentElement, null);

			const popover2 = manager.createPopover();
			assertEquals(manager.closeCurrent(), true);
			assertEquals(manager.closeCurrent(), false);

			popover2.close();
			assertEquals(manager.current, null);
			assertEquals(manager.currentContextMenu, null);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "context menu creation",
	fn() {
		const {manager, uninstall} = basicManager();
		try {
			assertEquals(manager.curtainEl.parentElement, null);

			const contextMenu = manager.createContextMenu();
			assertExists(manager.curtainEl.parentElement);
			assertStrictEquals(manager.current, contextMenu);
			assertStrictEquals(manager.currentContextMenu, contextMenu);

			assertThrows(() => {
				manager.createContextMenu();
			}, Error, "Cannot create a popover while one is already open.");

			assertEquals(manager.closeCurrent(), true);
			assertEquals(manager.closeCurrent(), false);
		} finally {
			uninstall();
		}
	},
});
