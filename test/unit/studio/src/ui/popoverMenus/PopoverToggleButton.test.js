import { assertExists } from "../../../../../../.denoTypes/vendor/deno.land/std@0.148.0/testing/asserts.js";
import { installFakeDocument, uninstallFakeDocument } from "../../../../../../.denoTypes/vendor/deno.land/x/fake_dom@v0.5.0/src/FakeDocument";
import { Popover } from "../../../../../../studio/src/ui/popoverMenus/Popover";
import { PopoverManager } from "../../../../../../studio/src/ui/popoverMenus/PopoverManager";
import { PopoverToggleButton } from "../../../../../../studio/src/ui/popoverMenus/PopoverToggleButton";
import { ColorizerFilterManager } from "../../../../../../studio/src/util/colorizerFilters/ColorizerFilterManager";
import { waitForMicrotasks } from "../../../../shared/waitForMicroTasks";

/**
 * @param {(ctx: {
 * 	manager: PopoverManager,
 * }) => void} cb
 */
async function PopoverToggleButtonTest(cb) {
	installFakeDocument();
	const originalMouseEvent = globalThis.MouseEvent;
	globalThis.MouseEvent = MouseEvent;
	const originalInnerWidth = window.innerWidth;
	const originalInnerHeight = window.innerHeight;
	window.innerWidth = 300;
	window.innerHeight = 400;
	try {
		const colorizerFilterManager = new ColorizerFilterManager();
		const manager = new PopoverManager(colorizerFilterManager);

		cb({
			manager,
		});

		// Created popovers update some elements in the next event loop
		await waitForMicrotasks();
	} finally {
		uninstallFakeDocument();
		globalThis.MouseEvent = originalMouseEvent;
		window.innerWidth = originalInnerWidth;
		window.innerHeight = originalInnerHeight;
	}
}

Deno.test("Creates a button", async () => {
	await PopoverToggleButtonTest(({manager}) => {
		const button = new PopoverToggleButton(Popover, manager, {});

		assertExists(button.el);
	});
});

Deno.test("Instantiates a Popover on click when one does not exist", () => {

});

Deno.test("Closes the Popover on click when one exists", () => {

});


