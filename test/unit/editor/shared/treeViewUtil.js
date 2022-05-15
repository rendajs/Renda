import {AssertionError, assertEquals} from "std/testing/asserts";

/**
 * @typedef ExpectedTreeViewStructure
 * @property {string} [name]
 * @property {ExpectedTreeViewStructure[]} [children]
 */

/**
 * @typedef AssertTreeViewStructureEqualsOptions
 * @property {boolean} [checkAllChildren]
 */

/**
 * @param {import("../../../../editor/src/ui/TreeView.js").TreeView} treeView
 * @param {ExpectedTreeViewStructure} expectedStructure
 * @param {AssertTreeViewStructureEqualsOptions} [options]
 */
export function assertTreeViewStructureEquals(treeView, expectedStructure, options) {
	options = {
		checkAllChildren: true,
		...options,
	};
	if (!treeViewStructureEquals(treeView, expectedStructure, options)) {
		const actualStructure = createExpectedTreeViewStructure(treeView, expectedStructure, options);
		assertEquals(actualStructure, expectedStructure);
		throw new AssertionError("The tree view structure is not equal to the expected structure.");
	}
}

/**
 * @param {import("../../../../editor/src/ui/TreeView.js").TreeView} treeView
 * @param {ExpectedTreeViewStructure} expectedStructure
 * @param {AssertTreeViewStructureEqualsOptions} options
 */
function treeViewStructureEquals(treeView, expectedStructure, options) {
	if (expectedStructure.name !== undefined && treeView.name != expectedStructure.name) return false;

	let expectedChildren = expectedStructure.children;
	if (expectedChildren === undefined && options.checkAllChildren) {
		expectedChildren = [];
	}

	if (expectedChildren !== undefined) {
		if (expectedChildren.length != treeView.children.length) return false;
		for (let i = 0; i < expectedChildren.length; i++) {
			if (!treeViewStructureEquals(treeView.children[i], expectedChildren[i], options)) return false;
		}
	}

	return true;
}

/**
 * @param {import("../../../../editor/src/ui/TreeView.js").TreeView} treeView
 * @param {ExpectedTreeViewStructure?} expectedStructure
 * @param {AssertTreeViewStructureEqualsOptions} options
 */
function createExpectedTreeViewStructure(treeView, expectedStructure, options) {
	/** @type {ExpectedTreeViewStructure} */
	const structure = {};

	if (!expectedStructure || expectedStructure.name !== undefined) structure.name = treeView.name;

	if (!expectedStructure || expectedStructure.children !== undefined || options.checkAllChildren) {
		structure.children = [];
		for (let i = 0; i < treeView.children.length; i++) {
			/** @type {ExpectedTreeViewStructure?} */
			let childExpectedStructure = null;
			if (expectedStructure && expectedStructure.children !== undefined) {
				childExpectedStructure = expectedStructure.children[i];
			}
			structure.children.push(createExpectedTreeViewStructure(treeView.children[i], childExpectedStructure, options));
		}
	}

	return structure;
}
