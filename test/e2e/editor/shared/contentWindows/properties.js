import {assertExists} from "std/testing/asserts";
import {elementWaitForSelector} from "../../../shared/util.js";
import {getContentWindowElement} from "../contentWindows.js";
import {getTreeViewItemElement} from "../treeView.js";

/**
 * @param {import("puppeteer").Page} page
 */
export async function getPropertiesWindowRootTreeView(page) {
	const propertiesWindow = await getContentWindowElement(page, "properties");
	const treeView = await elementWaitForSelector(page, propertiesWindow, ":scope > .editorContentWindowContent > div > .treeViewItem");
	assertExists(treeView);
	return treeView;
}

/**
 * @param {import("puppeteer").Page} page
 */
export async function getAssetPropertiesWindowContent(page) {
	const propertiesRootTreeView = await getPropertiesWindowRootTreeView(page);
	const assetContentEl = await getTreeViewItemElement(page, propertiesRootTreeView, ["Asset content will be placed here"]);
	assertExists(assetContentEl);
	return assetContentEl;
}
