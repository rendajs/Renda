import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {FakeMouseEvent} from "fake-dom/FakeMouseEvent.js";
import {assertEquals, assertExists, assertInstanceOf, assertStrictEquals, assertThrows} from "std/testing/asserts.ts";
import {Popover} from "../../../../../../studio/src/ui/popoverMenus/Popover.js";
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

			const popover = manager.addPopover();
			assertExists(manager.curtainEl.parentElement);
			assertStrictEquals(manager.getLastPopover(), popover);

			// The event listener is added in the next event loop, so we need to wait for this.
			await waitForMicrotasks();

			// Clicking the popover should not close it
			const mouseEvent1 = new FakeMouseEvent("click");
			popover.el.dispatchEvent(mouseEvent1);
			assertExists(manager.curtainEl.parentElement);
			assertStrictEquals(manager.getLastPopover(), popover);

			// But clicking any other element should
			const mouseEvent2 = new FakeMouseEvent("click");
			document.body.dispatchEvent(mouseEvent2);
			assertEquals(manager.curtainEl.parentElement, null);

			const popover2 = manager.addPopover();
			assertEquals(manager.removePopover(popover2), true);
			assertEquals(manager.removePopover(popover2), false);

			popover2.close();
			assertThrows(() => {
				manager.getLastPopover();
			});

			// Creating popover with custom class
			class ExtendedPopOver extends Popover {

			}
			const popover3 = manager.addPopover(ExtendedPopOver);
			assertInstanceOf(popover3, ExtendedPopOver);

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
			assertStrictEquals(manager.getLastPopover(), contextMenu);

			const contextMenu2 = manager.createContextMenu();
			assertExists(manager.curtainEl.parentElement);

			assertStrictEquals(manager.removePopover(contextMenu2), true);
			assertStrictEquals(manager.removePopover(contextMenu2), false);

			assertEquals(manager.removePopover(contextMenu), true);
			assertEquals(manager.removePopover(contextMenu), false);
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
			const popover = manager.addPopover();
			popover.setNeedsCurtain(false);

			assertEquals(manager.curtainEl.parentElement, null);

			// The event listener is added in the next event loop, so we need to wait for this.
			await waitForMicrotasks();

			// Clicking the popover should not close it
			const mouseEvent1 = new FakeMouseEvent("click");
			popover.el.dispatchEvent(mouseEvent1);
			assertEquals(manager.curtainEl.parentElement, null);
			assertStrictEquals(manager.getLastPopover(), popover);

			// But clicking any other element should
			const mouseEvent2 = new FakeMouseEvent("click");
			document.body.dispatchEvent(mouseEvent2);
			assertEquals(manager.curtainEl.parentElement, null);
		} finally {
			uninstall();
		}
	},
});
