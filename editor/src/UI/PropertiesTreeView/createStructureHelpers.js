/**
 * Utility function that assigns the correct type and provides autocompletion
 * for TreeViewStructures.
 * In JavaScript, this simply returns its input. But in TypeScript, the
 * return type is inferred from the input.
 * @template {import("./types.js").PropertiesTreeViewStructure} T
 * @param {T} structure
 */
export function createTreeViewStructure(structure) {
	return structure;
}

/**
 * Utility function that assigns the correct type and provides autocompletion
 * for PropertiesTreeViewEntries.
 * In JavaScript, this simply returns its input. But in TypeScript, the
 * return type is inferred from the input.
 * @template {import("./types.js").PropertiesTreeViewEntryOptions} T
 * @param {T} options
 */
export function createTreeViewEntryOptions(options) {
	return options;
}
