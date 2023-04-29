import {FakeMouseEvent} from "fake-dom/FakeMouseEvent.js";
import {assertEquals, assertExists, assertStrictEquals} from "std/testing/asserts.ts";
import {Popover} from "../../../../../../studio/src/ui/popoverMenus/Popover.js";
import {PopoverToggleButton} from "../../../../../../studio/src/ui/popoverMenus/PopoverToggleButton.js";
import {runWithDom} from "../../../shared/runWithDom.js";
import {assertSpyCalls, spy} from "std/testing/mock.ts";

function createManager() {
	return /** @type {import("../../../../../../studio/src/ui/popoverMenus/PopoverManager.js").PopoverManager} */ ({
		removePopover(popover) {},
	});
}

Deno.test({
	name: "Creates a button",
	fn() {
		runWithDom(() => {
			const manager = createManager();

			const button = new PopoverToggleButton({}, () => {
				return new Popover(manager);
			});

			assertExists(button.el);
		});
	},
});

Deno.test({
	name: "Calls onPopoverRequiredCallback when no popover exists yet",
	fn() {
		runWithDom(() => {
			const manager = createManager();

			const spyFn = () => {
				const popover = new Popover(manager);
				return popover;
			};
			const onPopoverRequiredCallbackSpy = spy(spyFn);

			const button = new PopoverToggleButton({}, onPopoverRequiredCallbackSpy);

			const mouseEvent = new FakeMouseEvent("click");
			button.el.dispatchEvent(mouseEvent);
			assertSpyCalls(onPopoverRequiredCallbackSpy, 1);
			assertStrictEquals(button.popoverInstance, onPopoverRequiredCallbackSpy.calls[0].returned);
		});
	},
});

Deno.test({
	name: "Closes the Popover on click when one exists",
	fn() {
		runWithDom(() => {
			const manager = createManager();

			const button = new PopoverToggleButton({}, () => {
				return new Popover(manager);
			});

			const mouseEvent = new FakeMouseEvent("click");
			button.el.dispatchEvent(mouseEvent);
			assertExists(button.popoverInstance);

			button.el.dispatchEvent(mouseEvent);
			assertEquals(button.popoverInstance, null);
		});
	},
});

Deno.test({
	name: "Original onClick callback is maintained",
	fn() {
		runWithDom(() => {
			const manager = createManager();

			let callcount = 0;
			const button = new PopoverToggleButton({
				onClick() {
					callcount++;
				},
			}, () => {
				return new Popover(manager);
			});

			const mouseEvent = new FakeMouseEvent("click");
			button.el.dispatchEvent(mouseEvent);
			assertEquals(callcount, 1);

			button.el.dispatchEvent(mouseEvent);
			assertEquals(callcount, 2);
		});
	},
});
