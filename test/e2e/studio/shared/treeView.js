import {assertExists} from "std/testing/asserts.ts";

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
	const result = await page.waitForFunction((treeViewElement, itemsPath) => {
		if (!globalThis.e2e) return null;
		return globalThis.e2e.getTreeViewPathElement(treeViewElement, itemsPath);
	}, {}, treeViewElementHandle, itemsPath);
	return /** @type {import("puppeteer").ElementHandle<Element>} */ (result);
}

/**
 * Waits until a child element of a tree view doesn't exist anymore.
 * For more info see {@linkcode getTreeViewItemElement}.
 * @param {import("puppeteer").Page} page
 * @param {import("puppeteer").ElementHandle} treeViewElementHandle
 * @param {(string | number)[]} itemsPath An array where each item represents the textContent of a treeViewRow element,
 * textContent of a propertiesTreeViewEntry, or index of a child.
 */
export async function waitForTreeViewDisappear(page, treeViewElementHandle, itemsPath) {
	await page.waitForFunction((treeViewElement, itemsPath) => {
		if (!globalThis.e2e) return false;
		const el = globalThis.e2e.getTreeViewPathElement(treeViewElement, itemsPath);
		return !el;
	}, {}, treeViewElementHandle, itemsPath);
}

/**
 * @param {import("puppeteer").ElementHandle} element
 */
export async function getPropertiesTreeViewEntryValueEl(element) {
	const guiEl = await element.$(":scope > .treeViewCustomEl.guiTreeViewEntry > .guiTreeViewEntryValue");
	assertExists(guiEl);
	return guiEl;
}
