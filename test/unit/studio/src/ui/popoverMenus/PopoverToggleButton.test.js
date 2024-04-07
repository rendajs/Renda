import { assertEquals, assertExists, assertStrictEquals } from "std/testing/asserts.ts";
import { PopoverToggleButton } from "../../../../../../studio/src/ui/popoverMenus/PopoverToggleButton.js";
import { runWithDom } from "../../../shared/runWithDom.js";
import { assertSpyCall, assertSpyCalls, spy } from "std/testing/mock.ts";

function createPopover() {
	const popover = /** @type {import("../../../../../../studio/src/ui/popoverMenus/Popover.js").Popover} */ ({
		setPos(pos) {},
		close() {},
	});
	return popover;
}

Deno.test({
	name: "Creates a button",
	fn() {
		runWithDom(() => {
			const button = new PopoverToggleButton({}, () => {
				return createPopover();
			});

			assertExists(button.el);
		});
	},
});

Deno.test({
	name: "Calls onPopoverRequiredCallback when no popover exists yet",
	fn() {
		runWithDom(() => {
			const popover = createPopover();
			const setPosSpy = spy(popover, "setPos");

			const spyFn = () => {
				return popover;
			};
			const onPopoverRequiredCallbackSpy = spy(spyFn);

			const button = new PopoverToggleButton({}, onPopoverRequiredCallbackSpy);

			button.click();
			assertSpyCalls(onPopoverRequiredCallbackSpy, 1);
			assertStrictEquals(button.popoverInstance, onPopoverRequiredCallbackSpy.calls[0].returned);
			assertSpyCalls(setPosSpy, 1);
			assertSpyCall(setPosSpy, 0, {
				args: [button],
			});
		});
	},
});

Deno.test({
	name: "Closes the Popover on click when one exists",
	fn() {
		runWithDom(() => {
			const popover = createPopover();
			const popoverCloseSpy = spy(popover, "close");
			const button = new PopoverToggleButton({}, () => {
				return popover;
			});

			button.click();
			assertSpyCalls(popoverCloseSpy, 0);
			assertExists(button.popoverInstance);

			button.click();
			assertSpyCalls(popoverCloseSpy, 1);
			assertEquals(button.popoverInstance, null);
		});
	},
});

Deno.test({
	name: "Original onClick callback is maintained",
	fn() {
		runWithDom(() => {
			let callcount = 0;
			const button = new PopoverToggleButton({
				onClick() {
					callcount++;
				},
			}, () => {
				return createPopover();
			});

			button.click();
			assertEquals(callcount, 1);

			button.click();
			assertEquals(callcount, 2);
		});
	},
});
