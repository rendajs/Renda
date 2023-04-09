import {assertEquals, assertExists, assertThrows} from "std/testing/asserts.ts";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {FakeMouseEvent} from "fake-dom/FakeMouseEvent.js";
import {Popover} from "../../../../../../studio/src/ui/popoverMenus/Popover.js";
import {PopoverManager} from "../../../../../../studio/src/ui/popoverMenus/PopoverManager.js";
import {PopoverToggleButton} from "../../../../../../studio/src/ui/popoverMenus/PopoverToggleButton.js";
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

Deno.test("Creates a button", async () => {
	const {manager, uninstall} = basicManager();
	try {
		const button = new PopoverToggleButton(Popover, manager, {});

		assertExists(button.el);
	} finally {
		uninstall();
	}
});

Deno.test("Instantiates a Popover on click when one does not exist", async () => {
	const {manager, uninstall} = basicManager();
	try {
		const button = new PopoverToggleButton(Popover, manager, {
			text: "Test",
		});

		assertExists(button.el);

		button.onPopoverCreated(async popover => {
			assertEquals(popover.el.parentElement, document.body);
			assertExists(manager.getLastPopover());
		});

		await waitForMicrotasks();

		const mouseEvent = new FakeMouseEvent("click");
		button.el.dispatchEvent(mouseEvent);
	} finally {
		uninstall();
	}
});

Deno.test("Closes the Popover on click when one exists", async () => {
	const {manager, uninstall} = basicManager();
	try {
		const button = new PopoverToggleButton(Popover, manager, {
			text: "Test",
		});

		assertExists(button.el);

		button.onPopoverCreated(async popover => {
			assertEquals(popover.el.parentElement, document.body);
			assertExists(manager.getLastPopover());

			const mouseEvent2 = new FakeMouseEvent("click");

			button.el.dispatchEvent(mouseEvent2);

			await waitForMicrotasks();

			assertThrows(() => {
				assertExists(manager.getLastPopover());
			});
		});

		await waitForMicrotasks();

		const mouseEvent = new FakeMouseEvent("click");
		button.el.dispatchEvent(mouseEvent);
	} finally {
		uninstall();
	}
});
