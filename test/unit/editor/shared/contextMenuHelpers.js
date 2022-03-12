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
