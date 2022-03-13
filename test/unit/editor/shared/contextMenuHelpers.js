import {assertEquals} from "asserts";

/**
 * @param {import("../../../../editor/src/ui/contextMenus/ContextMenu.js").ContextMenuItemOpts} itemOpts
 */
function fillContextMenuItemOptsDefaults(itemOpts) {
	const newOpts = /** @type {import("../../../../editor/src/ui/contextMenus/ContextMenu.js").ContextMenuItemOpts} */ ({
		disabled: false,
		...itemOpts,
	});
	delete newOpts.onClick;
	return newOpts;
}

/**
 * @param {import("../../../../editor/src/ui/contextMenus/ContextMenu.js").ContextMenuStructure} structure
 */
function fillContextMenuStructureDefaults(structure) {
	/** @type {import("../../../../editor/src/ui/contextMenus/ContextMenu.js").ContextMenuStructure} */
	const newStructure = [];
	for (const item of structure) {
		newStructure.push(fillContextMenuItemOptsDefaults(item));
	}
	return newStructure;
}

/**
 * @param {import("../../../../editor/src/ui/contextMenus/ContextMenu.js").ContextMenuStructure} actual
 * @param {import("../../../../editor/src/ui/contextMenus/ContextMenu.js").ContextMenuStructure} expected
 */
export function assertContextMenuStructureEquals(actual, expected) {
	const newActual = fillContextMenuStructureDefaults(actual);
	const newExpected = fillContextMenuStructureDefaults(expected);
	// TODO: add support for nested structures
	assertEquals(newActual, newExpected);
}

/**
 * @param {import("../../../../editor/src/ui/contextMenus/ContextMenu.js").ContextMenuStructure} structure
 * @param {string[]} itemsPath
 * @param {import("../../../../editor/src/ui/contextMenus/ContextMenu.js").ContextMenuItemClickEvent?} event
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
