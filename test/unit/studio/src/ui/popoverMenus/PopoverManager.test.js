import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {FakeMouseEvent} from "fake-dom/FakeMouseEvent.js";
import {assertEquals, assertExists, assertStrictEquals, assertThrows} from "std/testing/asserts.ts";
import {PopoverManager} from "../../../../../../studio/src/ui/popoverMenus/PopoverManager.js";
import {ColorizerFilterManager} from "../../../../../../studio/src/util/colorizerFilters/ColorizerFilterManager.js";
import {waitForMicrotasks} from "../../../../shared/waitForMicroTasks.js";

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
	async fn() {
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

			// The event listener is added in the next event loop, so we need to wait for this.
			await waitForMicrotasks();

			// Clicking the popover should not close it
			const mouseEvent1 = new FakeMouseEvent("click");
			popover.el.dispatchEvent(mouseEvent1);
			assertExists(manager.curtainEl.parentElement);
			assertStrictEquals(manager.current, popover);

			// But clicking any other element should
			const mouseEvent2 = new FakeMouseEvent("click");
			document.body.dispatchEvent(mouseEvent2);
			assertEquals(manager.curtainEl.parentElement, null);

			const popover2 = manager.createPopover();
			assertEquals(manager.closeCurrent(), true);
			assertEquals(manager.closeCurrent(), false);

			popover2.close();
			assertEquals(manager.current, null);
			assertEquals(manager.currentContextMenu, null);

			// Wait for click event listener to get removed
			await waitForMicrotasks();
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

Deno.test({
	name: "popover without a curtain",
	async fn() {
		const {manager, uninstall} = basicManager();
		try {
			const popover = manager.createPopover();
			popover.setNeedsCurtain(false);

			assertEquals(manager.curtainEl.parentElement, null);

			// The event listener is added in the next event loop, so we need to wait for this.
			await waitForMicrotasks();

			// Clicking the popover should not close it
			const mouseEvent1 = new FakeMouseEvent("click");
			popover.el.dispatchEvent(mouseEvent1);
			assertEquals(manager.curtainEl.parentElement, null);
			assertStrictEquals(manager.current, popover);

			// But clicking any other element should
			const mouseEvent2 = new FakeMouseEvent("click");
			document.body.dispatchEvent(mouseEvent2);
			assertEquals(manager.curtainEl.parentElement, null);
		} finally {
			uninstall();
		}
	},
});
