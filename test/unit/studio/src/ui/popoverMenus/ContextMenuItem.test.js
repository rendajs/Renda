import {assertEquals} from "std/testing/asserts.ts";
import {ContextMenuItem} from "../../../../../../studio/src/ui/popoverMenus/ContextMenuItem.js";
import {ContextMenu} from "../../../../../../studio/src/ui/popoverMenus/ContextMenu.js";
import {PopoverManager} from "../../../../../../studio/src/ui/popoverMenus/PopoverManager.js";
import {ColorizerFilterManager} from "../../../../../../studio/src/util/colorizerFilters/ColorizerFilterManager.js";
import {runWithDom} from "../../../shared/runWithDom.js";

/**
 * @returns {ContextMenu}
 */
function createContextMenu() {
	const colorizerFilterManager = new ColorizerFilterManager();
	const popoverManager = new PopoverManager(colorizerFilterManager);
	return new ContextMenu(popoverManager);
}

Deno.test({
	name: "Creates a ContextMenuItem with text",
	fn: () => {
		runWithDom(() => {
			const contextMenu = createContextMenu();

			const contextMenuItem = new ContextMenuItem(contextMenu, {
				text: "Test",
			});

			assertEquals(contextMenuItem.textEl.textContent, "Test");
		});
	},
});

Deno.test({
	name: "Creates a contextMenu visual divider",
	fn: () => {
		runWithDom(() => {
			const contextMenu = createContextMenu();

			const contextMenuItem = new ContextMenuItem(contextMenu, {
				horizontalLine: true,
			});

			assertEquals(contextMenuItem.el.classList.contains("context-menu-divider"), true);
		});
	},
});

Deno.test({
	name: "Creates a ContextMenuItem with an icon",
	fn: () => {
		runWithDom(() => {
			const contextMenu = createContextMenu();

			const contextMenuItem = new ContextMenuItem(contextMenu, {
				showBullet: true,
			});

			assertEquals(contextMenuItem.iconEl.style.backgroundImage.includes("contextMenuBullet"), true);
		});
	},
});

Deno.test({
	name: "May change ContextMenuItem text",
	fn: () => {
		runWithDom(() => {
			const contextMenu = createContextMenu();

			const contextMenuItem = new ContextMenuItem(contextMenu, {
				text: "Test",
			});

			contextMenuItem.setText("Test2");

			assertEquals(contextMenuItem.textEl.textContent, "Test2");
		});
	},
});

Deno.test({
	name: "May change ContextMenuItem icon",
	fn: () => {
		runWithDom(() => {
			const contextMenu = createContextMenu();

			const contextMenuItem = new ContextMenuItem(contextMenu, {
				text: "Test",
				showBullet: true,
			});

			contextMenuItem.showBullet = false;
			contextMenuItem.showCheckmark = true;

			assertEquals(contextMenuItem.iconEl.style.backgroundImage.includes("contextMenuCheck"), true);
		});
	},
});

Deno.test({
	name: "shows right arrow",
	fn: () => {
		runWithDom(() => {
			const contextMenu = createContextMenu();

			const contextMenuItem = new ContextMenuItem(contextMenu, {
				text: "Test",
				showRightArrow: true,
			});

			assertEquals(contextMenuItem.el.children[1].classList.contains("right-arrow"), true);
		});
	},
});
