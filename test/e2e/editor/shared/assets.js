import {click} from "../../shared/util.js";
import {getContentWindowElement} from "./contentWindows.js";
import {clickContextMenuItem} from "./contextMenu.js";
import {getNotTreeViewItemElement, getTreeViewItemElement} from "./treeView.js";

/**
 * Clicks the create asset button in the project window and clicks the specified
 * asset from the context menu.
 * To wait for the asset to exist use {@linkcode getAssetTreeView}.
 *
 * @param {import("puppeteer").Page} page
 * @param {Deno.TestContext} testContext
 * @param {string[]} createMenuPath The path of the context menu item that creates the asset.
 */
export async function createAsset(page, testContext, createMenuPath) {
	const projectEl = await getContentWindowElement(page, "project");

	// Get the selected folder or the root folder, so that we can wait for added children later.

	await testContext.step({
		name: "Click create asset button",
		async fn() {
			const createAssetButtonEl = await projectEl.$(".editorContentWindowTopButtonBar > .button:nth-child(2)");
			if (!createAssetButtonEl) {
				throw new Error("Could not find create asset button");
			}
			await click(page, createAssetButtonEl);
		},
	});

	await clickContextMenuItem(page, testContext, createMenuPath);
}

/**
 * @template {boolean} TIsNotFunction
 * @param {import("puppeteer").Page} page
 * @param {string[]} assetPath
 * @param {TIsNotFunction} isNotFunction
 */
async function getAssetTreeViewHelper(page, assetPath, isNotFunction) {
	const projectEl = await getContentWindowElement(page, "project");
	const projectRootTreeViewEl = await projectEl.$(":scope > .editorContentWindowContent > .treeViewItem");
	if (!projectRootTreeViewEl) {
		throw new Error("Project root treeview element not found.");
	}
	let result;
	if (isNotFunction) {
		result = await getNotTreeViewItemElement(page, projectRootTreeViewEl, assetPath);
	} else {
		result = await getTreeViewItemElement(page, projectRootTreeViewEl, assetPath);
	}
	return /** @type {TIsNotFunction extends true ? import("puppeteer").JSHandle<boolean> : import("puppeteer").ElementHandle} */ (result);
}

/**
 * Finds the project window and searches for the specified asset treeview element.
 * @param {import("puppeteer").Page} page
 * @param {string[]} assetPath
 */
export async function getAssetTreeView(page, assetPath) {
	return await getAssetTreeViewHelper(page, assetPath, false);
}

/**
 * Finds the project window and searches for the specified asset treeview element.
 * @param {import("puppeteer").Page} page
 * @param {string[]} assetPath
 */
export async function getNotAssetTreeView(page, assetPath) {
	return await getAssetTreeViewHelper(page, assetPath, true);
}

/**
 * @param {import("puppeteer").Page} page
 * @param {Deno.TestContext} testContext
 * @param {string[]} assetPath
 * @param {import("puppeteer").ClickOptions} [clickOptions]
 */
export async function clickAsset(page, testContext, assetPath, clickOptions) {
	const joinedPath = assetPath.join("/");
	await testContext.step({
		name: `Click asset "${joinedPath}"`,
		async fn() {
			const createdAssetTreeView = await getAssetTreeView(page, assetPath);
			await click(page, createdAssetTreeView, clickOptions);
		},
	});
}
