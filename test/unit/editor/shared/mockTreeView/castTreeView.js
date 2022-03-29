/**
 * @template T
 * @typedef {T extends import("../../../../../editor/src/ui/propertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntry<infer EntryType> ?
 *	import("./PropertiesTreeViewEntry.js").MockPropertiesTreeViewEntry<EntryType> :
 *	never} MapTreeViewToMock
 */

/**
 * Utility function for casting types to their mock counterparts.
 * In JavaScript this returns the passed in object without making any assertions.
 * The returned TypeScript type depends on the type that was passed in.
 *
 * @template T
 * @param {T} treeView
 */
export function castTreeView(treeView) {
	const cast = /** @type {unknown} */ (treeView);
	return /** @type {MapTreeViewToMock<T>} */ (cast);
}
