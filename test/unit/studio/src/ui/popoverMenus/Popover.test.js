import { installFakeDocument, uninstallFakeDocument } from "fake-dom/FakeDocument.js";
import { MouseEvent } from "fake-dom/FakeMouseEvent.js";
import { assertEquals, assertExists } from "std/testing/asserts.ts";
import { PopoverManager } from "../../../../../../studio/src/ui/popoverMenus/PopoverManager.js";
import { ColorizerFilterManager } from "../../../../../../studio/src/util/colorizerFilters/ColorizerFilterManager.js";
import { waitForMicrotasks } from "../../../../../../src/util/waitForMicroTasks.js";

/**
 * @param {(ctx: {
 * 	manager: PopoverManager,
 * 	popover: import("../../../../../../studio/src/ui/popoverMenus/Popover.js").Popover,
 * }) => void} cb
 */
async function basicPopoverTest(cb) {
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
		const popover = manager.addPopover();

		cb({
			manager,
			popover,
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

Deno.test({
	name: "setPos()",
	async fn() {
		await basicPopoverTest(({ popover }) => {
			assertExists(popover.arrowEl);

			popover.setPos(new MouseEvent("contextmenu", {
				clientX: 200,
				clientY: 300,
			}));

			assertEquals(popover.el.style.left, "150px");
			assertEquals(popover.el.style.top, "307px");
			assertEquals(popover.arrowEl.classList.contains("bottom"), false);
			assertEquals(popover.arrowEl.style.left, "50px");

			// near the bottom of the screen
			popover.setPos(new MouseEvent("contextmenu", {
				clientX: 200,
				clientY: 490,
			}));

			assertEquals(popover.el.style.left, "150px");
			assertEquals(popover.el.style.top, "383px");
			assertEquals(popover.arrowEl.classList.contains("bottom"), true);
			assertEquals(popover.arrowEl.style.left, "50px");

			// near the left of the screen
			popover.setPos(new MouseEvent("contextmenu", {
				clientX: 10,
				clientY: 300,
			}));

			assertEquals(popover.el.style.left, "0px");
			assertEquals(popover.el.style.top, "307px");
			assertEquals(popover.arrowEl.classList.contains("bottom"), false);
			assertEquals(popover.arrowEl.style.left, "10px");

			// near the right of the screen
			popover.setPos(new MouseEvent("contextmenu", {
				clientX: 290,
				clientY: 300,
			}));

			assertEquals(popover.el.style.left, "200px");
			assertEquals(popover.el.style.top, "307px");
			assertEquals(popover.arrowEl.classList.contains("bottom"), false);
			assertEquals(popover.arrowEl.style.left, "90px");
		});
	},
});
