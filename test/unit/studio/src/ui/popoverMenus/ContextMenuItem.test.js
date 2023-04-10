import { assertEquals } from "std/testing/asserts.ts";
import { ContextMenuItem } from "../../../../../../studio/src/ui/popoverMenus/ContextMenuItem.js";
import { ContextMenu } from "../../../../../../studio/src/ui/popoverMenus/ContextMenu.js";
import { PopoverManager } from "../../../../../../studio/src/ui/popoverMenus/PopoverManager.js";
import { ColorizerFilterManager } from "../../../../../../studio/src/util/colorizerFilters/ColorizerFilterManager.js";

/**
 * @returns {ContextMenu}
 */
function createContextMenu() {
	const colorizerFilterManager = new ColorizerFilterManager();
	const popoverManager = new PopoverManager(colorizerFilterManager);
	return new ContextMenu(popoverManager);
}

Deno.test({
	name: "Creates a new context menu item",
	fn: () => {
		const contextMenu = createContextMenu();

		const contextMenuItem = new ContextMenuItem(contextMenu,{
			text: "Test",
			onClick: () => {},
		});

		assertEquals(contextMenuItem.textEl?.innerText, "Test");
		assertEquals(contextMenuItem.onClick, () => {});
	}
});

Deno.test({
	name: "Creates a context menu divider",
	fn: () => {}
});

Deno.test({
	name: "Creates context menu with proper tag structure",
	fn: () => {

	}
});

Deno.test({
	name: "",
	fn: () => {}
});

Deno.test({
	name: "",
	fn: () => {}
});

Deno.test({
	name: "",
	fn: () => {}
});

Deno.test({
	name: "",
	fn: () => {}
});
