import {click} from "../../shared/util.js";
import {getContentWindowElement} from "./contentWindows.js";
import {clickContextMenuItem} from "./contextMenu.js";
import {getTreeViewItemElement, waitForTreeViewDisappear} from "./treeView.js";

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
			const createAssetButtonEl = await projectEl.$(".studio-content-window-top-button-bar > .button:nth-child(2)");
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
 */
async function getProjectRootTreeViewEl(page) {
	const projectEl = await getContentWindowElement(page, "project");
	const projectRootTreeViewEl = await projectEl.$(":scope > .studio-content-window-content > .treeViewItem");
	if (!projectRootTreeViewEl) {
		throw new Error("Project root treeview element not found.");
	}
	return projectRootTreeViewEl;
}

/**
 * Finds the project window and searches for the specified asset treeview element.
 * @param {import("puppeteer").Page} page
 * @param {string[]} assetPath
 */
export async function getAssetTreeView(page, assetPath) {
	const projectRootTreeViewEl = await getProjectRootTreeViewEl(page);
	const result = await getTreeViewItemElement(page, projectRootTreeViewEl, assetPath);
	return /** @type {import("puppeteer").ElementHandle} */ (result);
}

/**
 * Finds the project window and waits for an asset treeview to disappear.
 * @param {import("puppeteer").Page} page
 * @param {string[]} assetPath
 */
export async function waitForAssetDissappear(page, assetPath) {
	const projectRootTreeViewEl = await getProjectRootTreeViewEl(page);
	await waitForTreeViewDisappear(page, projectRootTreeViewEl, assetPath);
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
