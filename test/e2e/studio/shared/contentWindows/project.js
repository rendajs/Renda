import { log } from "../../../shared/log.js";
import { click } from "../../../shared/util.js";
import { getContentWindowElement } from "../contentWindows.js";
import { clickContextMenuItem } from "../contextMenu.js";
import { getTreeViewItemElement, waitForTreeViewExists } from "../treeView.js";

/**
 * Clicks the create asset button in the project window and clicks the specified
 * asset from the context menu.
 * To wait for the asset to exist use {@linkcode getAssetTreeView}.
 *
 * @param {import("puppeteer").Page} page
 * @param {string[]} createMenuPath The path of the context menu item that creates the asset.
 */
export async function createAsset(page, createMenuPath) {
	const projectEl = await getContentWindowElement(page, "renda:project");

	// Get the selected folder or the root folder, so that we can wait for added children later.

	log("Click create asset button");
	const createAssetButtonEl = await projectEl.$(".studio-content-window-top-button-bar > .button[title='Create Asset']");
	if (!createAssetButtonEl) {
		throw new Error("Could not find create asset button");
	}
	await click(page, createAssetButtonEl);

	await clickContextMenuItem(page, createMenuPath);
}

/**
 * @param {import("puppeteer").Page} page
 */
async function getProjectRootTreeViewEl(page) {
	const projectEl = await getContentWindowElement(page, "renda:project");
	const projectRootTreeViewEl = await projectEl.$(":scope > .studio-content-window-content > .tree-view-item");
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
 * Finds the project window and waits until an asset treeview exists or not.
 * @param {import("puppeteer").Page} page
 * @param {boolean} exists
 * @param {string[]} assetPath
 */
export async function waitForAssetExists(page, exists, assetPath) {
	const existsStr = exists ? "exist" : "not exist";
	log(`Wait for asset to ${existsStr}: ${assetPath.join(" > ")}`);
	const projectRootTreeViewEl = await getProjectRootTreeViewEl(page);
	await waitForTreeViewExists(page, projectRootTreeViewEl, exists, assetPath);
	if (exists) {
		log("Asset exists");
	} else {
		log("Asset doesn't exist");
	}
}

/**
 * @param {import("puppeteer").Page} page
 * @param {string[]} assetPath
 * @param {import("puppeteer").ClickOptions} [clickOptions]
 */
export async function clickAsset(page, assetPath, clickOptions) {
	const joinedPath = assetPath.join("/");
	log(`Click asset "${joinedPath}"`);
	const createdAssetTreeView = await getAssetTreeView(page, assetPath);
	await click(page, createdAssetTreeView, clickOptions);
}
