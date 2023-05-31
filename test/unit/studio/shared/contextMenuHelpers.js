import {AssertionError, assertEquals, assertNotEquals, equal} from "std/testing/asserts.ts";
import {spy} from "std/testing/mock.ts";

/**
 * @param {import("../../../../studio/src/ui/popoverMenus/ContextMenu.js").ContextMenuItemOpts} itemOpts
 */
async function fillContextMenuItemOptsDefaults(itemOpts, {
	executeSubmenuFunctions = true,
} = {}) {
	const newOpts = /** @type {import("../../../../studio/src/ui/popoverMenus/ContextMenu.js").ContextMenuItemOpts} */ ({
		disabled: false,
		tooltip: "",
		...itemOpts,
	});
	if (newOpts.submenu instanceof Array) {
		newOpts.submenu = await fillContextMenuStructureDefaults(newOpts.submenu);
	} else if (newOpts.submenu instanceof Function) {
		if (executeSubmenuFunctions) {
			// TODO: prevent infinite recursion by tracking which functions have already been executed
			const result = await newOpts.submenu();
			newOpts.submenu = await fillContextMenuStructureDefaults(result);
		} else {
			delete newOpts.submenu;
		}
	}
	delete newOpts.onClick;
	return newOpts;
}

/**
 * @param {import("../../../../studio/src/ui/popoverMenus/ContextMenu.js").ContextMenuStructure} structure
 */
async function fillContextMenuStructureDefaults(structure) {
	/** @type {import("../../../../studio/src/ui/popoverMenus/ContextMenu.js").ContextMenuStructure} */
	const newStructure = [];
	for (const item of structure) {
		newStructure.push(await fillContextMenuItemOptsDefaults(item));
	}
	return newStructure;
}

/**
 * @param {import("../../../../studio/src/ui/popoverMenus/ContextMenu.js").ContextMenuStructure} actual
 * @param {import("../../../../studio/src/ui/popoverMenus/ContextMenu.js").ContextMenuStructure} expected
 */
export async function assertContextMenuStructureEquals(actual, expected) {
	const newActual = await fillContextMenuStructureDefaults(actual);
	const newExpected = await fillContextMenuStructureDefaults(expected);
	assertEquals(newActual, newExpected);
}

/**
 * @param {import("../../../../studio/src/ui/popoverMenus/ContextMenu.js").ContextMenuStructure} structure
 * @param {import("../../../../studio/src/ui/popoverMenus/ContextMenu.js").ContextMenuItemOpts} expectedChild
 */
export async function contextMenuStructureContains(structure, expectedChild) {
	const structureWithDefaults = await fillContextMenuStructureDefaults(structure);
	const childWithDefaults = await fillContextMenuItemOptsDefaults(expectedChild);
	for (const item of structureWithDefaults) {
		if (equal(item, childWithDefaults)) return true;
	}
	return false;
}

/**
 * Asserts if the provided structure contains an exact match of one of its direct children.
 * Subchildren are not recursively searched for a match.
 * @param {import("../../../../studio/src/ui/popoverMenus/ContextMenu.js").ContextMenuStructure} structure
 * @param {import("../../../../studio/src/ui/popoverMenus/ContextMenu.js").ContextMenuItemOpts} expectedChild
 */
export async function assertContextMenuStructureContains(structure, expectedChild) {
	if (await contextMenuStructureContains(structure, expectedChild)) return;
	throw new AssertionError(`Structure did not contain a child that exactly matches ${JSON.stringify(expectedChild)}. The offending structure is ${JSON.stringify(structure)}`);
}

/**
 * Asserts if the provided structure does not contain an exact match in one of its direct children.
 * Subchildren are not recursively searched for a match.
 * @param {import("../../../../studio/src/ui/popoverMenus/ContextMenu.js").ContextMenuStructure} structure
 * @param {import("../../../../studio/src/ui/popoverMenus/ContextMenu.js").ContextMenuItemOpts} expectedChild
 */
export async function assertContextMenuStructureNotContains(structure, expectedChild) {
	if (!(await contextMenuStructureContains(structure, expectedChild))) return;
	throw new AssertionError(`Expected structure to not contain child that matches $JSON.stringify(expectedChild)}. The offending structure is ${JSON.stringify(structure)}`);
}

/**
 * Asserts if the provided structure does not contain an exact match in one of its direct children.
 * Subchildren are not recursively searched for a match.
 * @param {import("../../../../studio/src/ui/popoverMenus/ContextMenu.js").ContextMenuStructure} structure
 * @param {string} expectedText
 */
export async function assertContextMenuStructureNotContainsText(structure, expectedText) {
	for (const item of structure) {
		assertNotEquals(item.text, expectedText, `Expected context menu not to contain an item with ${expectedText}`);
	}
}

/**
 * @param {import("../../../../studio/src/ui/popoverMenus/ContextMenu.js").ContextMenuStructure} structure
 * @param {string[]} itemsPath
 * @param {import("../../../../studio/src/ui/popoverMenus/ContextMenu.js").ContextMenuItemClickEvent?} event
 */
export async function triggerContextMenuItem(structure, itemsPath, event = null) {
	let currentStructure = structure;
	if (!event) {
		event = {
			item: /** @type {any} */ ({}),
			preventMenuClose: () => {},
		};
	}
	for (const [i, itemName] of itemsPath.entries()) {
		for (const item of currentStructure) {
			if (item.text == itemName) {
				// If this is the last item, trigger its click callback
				if (i == itemsPath.length - 1) {
					if (!item.onClick) {
						throw new Error(`Failed to trigger context menu at "${itemsPath.join(" > ")} because it has no 'onClick' property`);
					}
					await item.onClick(event);
				// otherwise, recurse deeper into the structure
				} else {
					if (!item.submenu) {
						throw new Error(`Failed to find context menu item at "${itemsPath.join(" > ")}", item "${itemName}" is does not have a submenu.`);
					}
					if (item.submenu instanceof Array) {
						currentStructure = item.submenu;
					} else if (item.submenu instanceof Function) {
						currentStructure = await item.submenu();
					}
				}
			}
		}
	}
}

/**
 * Creates a popovermanager that you can use to get access to created context menus.
 */
export function createMockPopoverManager() {
	/** @type {import("../../../../studio/src/ui/popoverMenus/ContextMenu.js").ContextMenuStructure[]} */
	const structureCalls = [];
	const mockPopoverManager = /** @type {import("../../../../studio/src/ui/popoverMenus/PopoverManager.js").PopoverManager} */ ({
		createContextMenu(structure) {
			if (structure) structureCalls.push(structure);
			const contextMenu = /** @type {import("../../../../studio/src/ui/popoverMenus/ContextMenu.js").ContextMenu} */ ({
				setPos(item) {},
				createStructure(structure) {
					structureCalls.push(structure);
				},
			});
			return contextMenu;
		},
	});
	const createContextMenuSpy = spy(mockPopoverManager, "createContextMenu");
	return {
		mockPopoverManager,
		createContextMenuSpy,
		getLastCreatedStructure() {
			const lastCall = structureCalls.at(-1);
			if (!lastCall) {
				throw new AssertionError("createContextMenu() was never called");
			}
			return lastCall;
		},
	};
}
