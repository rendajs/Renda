/**
 * @template T
 * @typedef {T extends import("../../../../../studio/src/ui/propertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntry<infer EntryType extends import("../../../../../studio/src/ui/propertiesTreeView/types").GuiTypeInstances> ?
 *		import("./PropertiesTreeViewEntry.js").MockPropertiesTreeViewEntry<EntryType> :
 * 	T extends import("../../../../../studio/src/ui/propertiesTreeView/PropertiesTreeView.js").PropertiesTreeView<infer Structure extends import("../../../../../studio/src/ui/propertiesTreeView/types").PropertiesTreeViewStructure> ?
 * 		import("./PropertiesTreeView.js").MockPropertiesTreeView<Structure> :
 * 	never} MapTreeViewToMock
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
