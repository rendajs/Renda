import {assertExists} from "std/testing/asserts.ts";
import {waitForFunction} from "../../shared/util.js";

/**
 * Waits until a child element of a tree view exists and returns its row element.
 * This can be used to traverse down several types of objects. You can either
 * find TreeViews, PropertiesTreeViewEntries, children of PropertiesTreeViewEntries
 * that are either an object or array. Or all of these combined.
 * Additionally, if the index of a child is known, you can specify it by providing
 * an integer rather than a string in the `itemsPath`.
 *
 * @param {import("puppeteer").Page} page
 * @param {import("puppeteer").ElementHandle} treeViewElementHandle
 * @param {(string | number)[]} itemsPath An array where each item represents the textContent of a treeViewRow element,
 * textContent of a propertiesTreeViewEntry, or index of a child.
 */
export async function getTreeViewItemElement(page, treeViewElementHandle, itemsPath) {
	return await getTreeViewItemElementHelper(page, treeViewElementHandle, itemsPath, false);
}

/**
 * Waits until a child element of a tree view doesn't exist anymore.
 * For more info see {@linkcode getTreeViewItemElement}.
 * @param {import("puppeteer").Page} page
 * @param {import("puppeteer").ElementHandle} treeViewElementHandle
 * @param {(string | number)[]} itemsPath An array where each item represents the textContent of a treeViewRow element,
 * textContent of a propertiesTreeViewEntry, or index of a child.
 */
export async function getNotTreeViewItemElement(page, treeViewElementHandle, itemsPath) {
	return await getTreeViewItemElementHelper(page, treeViewElementHandle, itemsPath, true);
}

/**
 * Helper function for {@linkcode getTreeViewItemElement} and {@linkcode getNotTreeViewItemElement}.
 * @param {import("puppeteer").Page} page
 * @param {import("puppeteer").ElementHandle} treeViewElementHandle
 * @param {(string | number)[]} itemsPath
 * @param {boolean} isNotFunction
 */
async function getTreeViewItemElementHelper(page, treeViewElementHandle, itemsPath, isNotFunction) {
	const result = await waitForFunction(page, (treeViewElement, itemsPath, isNotFunction) => {
		const jointItemsPath = itemsPath.join(" > ");
		if (!treeViewElement.classList.contains("treeViewItem")) {
			throw new TypeError(`Invalid root treeViewElementHandle element type received while trying to find the treeview at ${jointItemsPath}. Element is not a TreeView because it doesn't have the "treeViewItem" class.`);
		}
		let currentTreeView = treeViewElement;
		for (let i = 0; i < itemsPath.length; i++) {
			const itemIdentifier = itemsPath[i];
			const treeViewChildren = Array.from(currentTreeView.querySelectorAll(":scope > .treeViewChildList > .treeViewItem"));
			let child;
			if (typeof itemIdentifier == "number") {
				child = treeViewChildren[itemIdentifier];
			} else {
				child = treeViewChildren.find(child => {
					// First check the row name, in case this is a regular TreeView.
					const row = child.querySelector(".treeViewRow");
					if (row.textContent == itemIdentifier) return true;

					// If this is a PropertiesTreeViewEntry, check the name of the entry.
					const labelEl = child.querySelector(".treeViewCustomEl.guiTreeViewEntry > .guiTreeViewEntryLabel");
					if (labelEl && labelEl.textContent == itemIdentifier) return true;

					return false;
				});
			}
			if (!child) {
				if (isNotFunction) {
					return true;
				} else {
					return null;
				}
			}
			currentTreeView = child;
		}
		if (isNotFunction) {
			return false;
		} else {
			return currentTreeView;
		}
	}, {}, treeViewElementHandle, itemsPath, isNotFunction);
	return result;
}

/**
 * @param {import("puppeteer").ElementHandle} element
 */
export async function getPropertiesTreeViewEntryValueEl(element) {
	const guiEl = await element.$(":scope > .treeViewCustomEl.guiTreeViewEntry > .guiTreeViewEntryValue");
	assertExists(guiEl);
	return guiEl;
}
