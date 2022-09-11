import {assertExists} from "std/testing/asserts.ts";
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
export async function getPropertiesWindowContentAsset(page) {
	const propertiesRootTreeView = await getPropertiesWindowRootTreeView(page);
	const assetContentHandle = await getTreeViewItemElement(page, propertiesRootTreeView, ["Asset content will be placed here"]);
	const assetContentEl = /** @type {import("puppeteer").ElementHandle<Element>?} */ (assetContentHandle.asElement());
	assertExists(assetContentEl);
	return assetContentEl;
}

/**
 * Gets a reference to the PropertiesWindowContent class of the current properties window.
 * Use this to access `PropertiesWindowContentEntity`, `PropertiesWindowContentAsset`, etc.
 * @param {import("puppeteer").Page} page
 */
export async function getPropertiesWindowContentReference(page) {
	const contentWindowReference = await getContentWindowReference(page, "properties");
	const propertiesWindowContentReference = await page.evaluateHandle(async contentWindow => {
		const {ContentWindowProperties} = await import("../../../../../editor/src/windowManagement/contentWindows/ContentWindowProperties.js");
		if (!(contentWindow instanceof ContentWindowProperties)) {
			throw new Error("Assertion failed, content is not an instance of ContentWindowProperties");
		}
		const content = contentWindow.activeContent;
		if (!content) {
			throw new Error("Unable to get properties window content reference from the content window.");
		}
		return content;
	}, contentWindowReference);
	return propertiesWindowContentReference;
}

/**
 * Gets a reference to the PropertiesAssetContent instance of the current properties window.
 * Use this to access instances like `PropertiesAssetContentMaterial`, `PropertiesAssetContentMesh`, etc.
 * @param {import("puppeteer").Page} page
 */
export async function getPropertiesAssetContentReference(page) {
	const propertiesWindowContentReference = await getPropertiesWindowContentReference(page);
	const propertiesAssetContentReference = await page.evaluateHandle(async propertiesWindowContent => {
		const {PropertiesWindowContentAsset} = await import("../../../../../editor/src/propertiesWindowContent/PropertiesWindowContentAsset.js");
		if (!(propertiesWindowContent instanceof PropertiesWindowContentAsset)) {
			throw new Error("Assertion failed, propertiesWindowContent is not an instance of PropertiesWindowContentAsset.");
		}
		const assetContent = propertiesWindowContent.activeAssetContent;
		if (!assetContent) {
			throw new Error("Unable to get asset content reference from properties window content.");
		}
		return assetContent;
	}, propertiesWindowContentReference);
	return propertiesAssetContentReference;
}
