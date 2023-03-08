import {AssertionError, assertEquals} from "std/testing/asserts.ts";
import "./initializeStudio.js";
import {PropertiesTreeViewEntry} from "../../../../studio/src/ui/propertiesTreeView/PropertiesTreeViewEntry.js";

/**
 * @typedef ExpectedTreeViewStructure
 * @property {string} [name]
 * @property {ExpectedTreeViewStructure[]} [children]
 * @property {boolean} [isPropertiesEntry]
 * @property {string} [propertiesLabel]
 * @property {import("../../../../studio/src/ui/propertiesTreeView/types").GuiTypes} [propertiesType]
 * @property {any} [propertiesValue]
 */

/**
 * @typedef AssertTreeViewStructureEqualsOptions
 * @property {boolean} [checkAllChildren] When true (which is the default), the child counts must exactly match the
 * expected structure. You can still omit the `children` property to assert if the child count is 0. But if you don't
 * specify the `children` property and a treeview contains one child or more, an error will be thrown.
 * When set to false, omitted `children` properties will not be checked for equality.
 */

/**
 * @param {import("../../../../studio/src/ui/TreeView.js").TreeView} treeView
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
 * @param {import("../../../../studio/src/ui/TreeView.js").TreeView} treeView
 * @param {ExpectedTreeViewStructure} expectedStructure
 * @param {AssertTreeViewStructureEqualsOptions} options
 */
function treeViewStructureEquals(treeView, expectedStructure, options) {
	if (expectedStructure.name !== undefined && treeView.name != expectedStructure.name) return false;

	if (expectedStructure.isPropertiesEntry !== undefined) {
		const isPropertiesEntry = (treeView instanceof PropertiesTreeViewEntry);
		if (expectedStructure.isPropertiesEntry != isPropertiesEntry) return false;
	}
	if (expectedStructure.propertiesLabel !== undefined) {
		if (!(treeView instanceof PropertiesTreeViewEntry) || expectedStructure.propertiesLabel != treeView.label.textContent) {
			return false;
		}
	}
	if (expectedStructure.propertiesType !== undefined) {
		if (!(treeView instanceof PropertiesTreeViewEntry) || expectedStructure.propertiesType != treeView.type) {
			return false;
		}
	}
	if (expectedStructure.propertiesValue !== undefined) {
		if (!(treeView instanceof PropertiesTreeViewEntry) || expectedStructure.propertiesValue != treeView.value) {
			return false;
		}
	}

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
 * @param {import("../../../../studio/src/ui/TreeView.js").TreeView} treeView
 * @param {ExpectedTreeViewStructure?} expectedStructure
 * @param {AssertTreeViewStructureEqualsOptions} options
 */
function createExpectedTreeViewStructure(treeView, expectedStructure, options) {
	/** @type {ExpectedTreeViewStructure} */
	const structure = {};

	if (!expectedStructure || expectedStructure.name !== undefined) structure.name = treeView.name;

	if (!expectedStructure || expectedStructure.children !== undefined || (options.checkAllChildren && treeView.children.length > 0)) {
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

	if (!expectedStructure || expectedStructure.isPropertiesEntry !== undefined) {
		structure.isPropertiesEntry = treeView instanceof PropertiesTreeViewEntry;
	}

	if (!expectedStructure) {
		if (treeView instanceof PropertiesTreeViewEntry) {
			structure.propertiesLabel = treeView.label.textContent || "";
			structure.propertiesType = treeView.type;
			structure.propertiesValue = treeView.value;
		}
	} else {
		if (expectedStructure.propertiesLabel !== undefined) {
			if (treeView instanceof PropertiesTreeViewEntry) {
				structure.propertiesLabel = treeView.label.textContent || "";
			} else {
				structure.propertiesLabel = "";
			}
		}
		if (expectedStructure.propertiesType !== undefined) {
			if (treeView instanceof PropertiesTreeViewEntry) {
				structure.propertiesType = treeView.type;
			} else {
				structure.propertiesType = undefined;
			}
		}
		if (expectedStructure.propertiesValue !== undefined) {
			if (treeView instanceof PropertiesTreeViewEntry) {
				structure.propertiesValue = treeView.value;
			} else {
				structure.propertiesValue = undefined;
			}
		}
	}

	return structure;
}

/**
 * @param {import("../../../../studio/src/ui/TreeView.js").TreeView} treeView
 * @param  {...number} indices
 */
export function getChildTreeViewFromIndices(treeView, ...indices) {
	let i = 0;
	while (i < indices.length) {
		const index = indices[i];
		treeView = treeView.children[index];
		if (!treeView) {
			throw new Error("The TreeView at this indices path does not exist.");
		}
		i++;
	}
	return treeView;
}
