import {assertExists} from "std/testing/asserts";
import {elementWaitForSelector} from "../../../shared/util.js";
import {getContentWindowElement, getContentWindowReference} from "../contentWindows.js";
import {getTreeViewItemElement} from "../treeView.js";

/**
 * Gets the root treeview element of the properties window.
 * @param {import("puppeteer").Page} page
 */
export async function getPropertiesWindowRootTreeView(page) {
	const propertiesWindow = await getContentWindowElement(page, "properties");
	const treeView = await elementWaitForSelector(page, propertiesWindow, ":scope > .editorContentWindowContent > div > .treeViewItem");
	assertExists(treeView);
	return treeView;
}

/**
 * Gets the asset content treeview element of the properties window.
 * @param {import("puppeteer").Page} page
 */
export async function getAssetPropertiesWindowContent(page) {
	const propertiesRootTreeView = await getPropertiesWindowRootTreeView(page);
	const assetContentEl = await getTreeViewItemElement(page, propertiesRootTreeView, ["Asset content will be placed here"]);
	assertExists(assetContentEl);
	return assetContentEl;
}

/**
 * Gets a reference to the PropertiesWindowContent class of the current properties window.
 * Use this to access `EntityPropertiesWindowContent`, `AssetPropertiesWindowContent`, etc.
 * @param {import("puppeteer").Page} page
 */
export async function getPropertiesWindowContentReference(page) {
	const contentWindowReference = await getContentWindowReference(page, "properties");
	const propertiesWindowContentReference = await page.evaluateHandle(contentWindowReference => {
		return contentWindowReference.activeContent;
	}, contentWindowReference);
	if (!propertiesWindowContentReference) {
		throw new Error("Unable to get properties window content reference from the content window.");
	}
	return propertiesWindowContentReference;
}

/**
 * Gets a reference to the PropertiesAssetContent instance of the current properties window.
 * Use this to access instances like `MaterialPropertiesAssetContent`, `MeshPropertiesAssetContent`, etc.
 * @param {import("puppeteer").Page} page
 */
export async function getPropertiesAssetContentReference(page) {
	const propertiesWindowContentReference = await getPropertiesWindowContentReference(page);
	const propertiesAssetContentReference = await page.evaluateHandle(propertiesWindowContentReference => {
		return propertiesWindowContentReference.activeAssetContent;
	}, propertiesWindowContentReference);
	if (!propertiesAssetContentReference) {
		throw new Error("Unable to get asset content reference from properties window content.");
	}
	return propertiesAssetContentReference;
}
