import {FakeMouseEvent} from "fake-dom/FakeMouseEvent.js";
import {assertExists, assertThrows} from "std/testing/asserts.ts";
import {Popover} from "../../../../../../studio/src/ui/popoverMenus/Popover.js";
import {PopoverManager} from "../../../../../../studio/src/ui/popoverMenus/PopoverManager.js";
import {PopoverToggleButton} from "../../../../../../studio/src/ui/popoverMenus/PopoverToggleButton.js";
import {ColorizerFilterManager} from "../../../../../../studio/src/util/colorizerFilters/ColorizerFilterManager.js";
import {waitForMicrotasks} from "../../../../shared/waitForMicroTasks.js";
import {runWithDom} from "../../../shared/runWithDom.js";

Deno.test({
	name: "Creates a button",
	async fn() {
		runWithDom(() => {
			const colorizerFilterManager = new ColorizerFilterManager();
			const manager = new PopoverManager(colorizerFilterManager);

			const button = new PopoverToggleButton(Popover, manager, {});

			assertExists(button.el);
		});
	},
});

Deno.test({
	name: "Instantiates a Popover on click when one does not exist",
	fn() {
		runWithDom(async () => {
			const colorizerFilterManager = new ColorizerFilterManager();
			const manager = new PopoverManager(colorizerFilterManager);

			const button = new PopoverToggleButton(Popover, manager, {});

			// wait for next event loop
			await waitForMicrotasks();

			const mouseEvent = new FakeMouseEvent("click");
			button.el.dispatchEvent(mouseEvent);
			assertExists(manager.getLastPopover());

			manager.getLastPopover().close();

			assertThrows(() => {
				manager.getLastPopover();
			});
		});
	},
});

Deno.test({
	name: "Closes the Popover on click when one exists",
	fn() {
		runWithDom(async () => {
			const colorizerFilterManager = new ColorizerFilterManager();
			const manager = new PopoverManager(colorizerFilterManager);

			const button = new PopoverToggleButton(Popover, manager, {});

			// wait for next event loop
			await waitForMicrotasks();

			const mouseEvent = new FakeMouseEvent("click");
			button.el.dispatchEvent(mouseEvent);
			assertExists(manager.getLastPopover());

			button.el.dispatchEvent(mouseEvent);
			assertThrows(() => {
				manager.getLastPopover();
			});
		});
	},
});
