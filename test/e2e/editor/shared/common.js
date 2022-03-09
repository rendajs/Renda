import {click, hover, waitForFunction} from "../../shared/util.js";
import {editor} from "./evaluateTypes.js";

/**
 * @param {import("puppeteer").Page} page
 * @param {Deno.TestContext} testContext
 */
export async function waitForEditorLoad(page, testContext) {
	await testContext.step("Wait for editor to load", async () => {
		await page.evaluate(async () => {
			// @ts-expect-error
			await globalThis.projectSelector.waitForEditor();
		});
	});
}

/**
 * @param {import("puppeteer").Page} page
 * @param {Deno.TestContext} testContext
 * @param {boolean} allowExisting Whether it should resolve immediately if a project is already open.
 */
export async function waitForProjectOpen(page, testContext, allowExisting = true) {
	await waitForEditorLoad(page, testContext);
	await testContext.step("Wait for project to open", async () => {
		await page.evaluate(async allowExisting => {
			await editor.projectManager.waitForProjectOpen(allowExisting);
		}, allowExisting);
	});
}

/**
 * Opens the editor page and creates a new empty project.
 * @param {import("puppeteer").Page} page
 * @param {Deno.TestContext} testContext
 * @returns {Promise<void>} A promise that resolves when the editor is loaded and project fully opened.
 */
export async function setupNewProject(page, testContext) {
	await testContext.step({
		name: "Create a new project",
		fn: async () => {
			await click(page, ".project-selector-actions-list-container > .project-selector-list > .project-selector-button:nth-child(1)");
		},
	});

	await waitForProjectOpen(page, testContext);
}

// This type has its own closure in order to not export the type.
// See https://github.com/microsoft/TypeScript/issues/46011 and
// https://github.com/microsoft/TypeScript/issues/43869.
//
{
	/** @typedef {typeof import("../../../../editor/src/windowManagement/contentWindows/ContentWindow.js").ContentWindow} ContentWindow */
}

/**
 * Gets the first content window element of a given type.
 * @param {import("puppeteer").Page} page
 * @param {string} contentWindowType The static `contentWindowTypeId` property of the content window. See {@linkcode ContentWindow.contentWindowTypeId}.
 */
export async function getContentWindowElement(page, contentWindowType) {
	const el = await page.evaluateHandle(async contentWindowType => {
		const array = Array.from(editor.windowManager.getContentWindowsByType(contentWindowType));
		if (array.length <= 0) return null;
		const el = array[0].el;
		return el;
	}, contentWindowType);
	return /** @type {import("puppeteer").ElementHandle} */ (el);
}

/**
 * Waits until a child element of a tree view exists and returns its row element.
 *
 * @param {import("puppeteer").Page} page
 * @param {import("puppeteer").ElementHandle} treeViewElementHandle
 * @param {string[]} itemsPath
 */
export async function getTreeViewItemElement(page, treeViewElementHandle, itemsPath) {
	const result = await waitForFunction(page, (treeViewElement, itemsPath) => {
		const jointItemsPath = itemsPath.join(" > ");
		if (!treeViewElement.classList.contains("treeViewItem")) {
			throw new TypeError(`Invalid root treeViewElementHandle element type received while trying to find the treeview at ${jointItemsPath}. Element is not a TreeView because it doesn't have the "treeViewItem" class.`);
		}
		let currentTreeView = treeViewElement;
		for (let i = 0; i < itemsPath.length; i++) {
			const itemName = itemsPath[i];
			const children = Array.from(currentTreeView.querySelectorAll(".treeViewChildList > .treeViewItem"));
			const child = children.find(child => child.textContent == itemName);
			if (!child) return null;
			currentTreeView = child;
		}
		return currentTreeView;
	}, {}, treeViewElementHandle, itemsPath);
	return result;
}

/**
 * Waits for a context menu to open, then clicks the specified item and waits
 * for the context menu to close.
 *
 * @param {import("puppeteer").Page} page
 * @param {Deno.TestContext} testContext
 * @param {string[]} menuPath
 */
export async function clickContextMenuItem(page, testContext, menuPath) {
	await testContext.step({
		name: `Click context menu "${menuPath.join(" > ")}"`,
		fn: async () => {
			await page.waitForFunction(() => {
				return editor.contextMenuManager.current;
			});
			for (let i = 0; i < menuPath.length; i++) {
				const itemName = menuPath[i];
				const expectedSubmenuCount = i;
				const jsHandle = await page.evaluateHandle(async (itemName, expectedSubmenuCount, menuPath) => {
					if (!editor.contextMenuManager.current) throw new Error("Context menu no longer exists");
					// Submenus only get created when hovering over them. So we
					// can just recurse down all the existing menus and then
					// return the element from the last submenu.
					let submenuCount = 0;
					let currentMenu = editor.contextMenuManager.current;
					while (true) {
						const submenu = currentMenu.currentSubmenu;
						if (!submenu) break;
						currentMenu = submenu;
						submenuCount++;
					}
					if (submenuCount !== expectedSubmenuCount) {
						const nonSubmenuItemName = menuPath[submenuCount];
						throw new Error(`The submenu "${menuPath.join(" > ")}" does not exist. "${nonSubmenuItemName}" does not have a submenu.`);
					}
					const item = currentMenu.addedItems.find(item => item.textEl.textContent == itemName);
					if (!item) {
						throw new Error(`The submenu "${menuPath.join(" > ")}" does not exist. "${itemName}" at index ${submenuCount} does not exist.`);
					}
					return item.el;
				}, itemName, expectedSubmenuCount, menuPath);
				if (!jsHandle) {
					throw new Error(`The submenu "${menuPath.join(" > ")}" does not exist. Failed to get an item handle for "${itemName}" at index ${i}.`);
				}
				const elementHandle = /** @type {import("puppeteer").ElementHandle} */ (jsHandle);
				const lastItem = i >= menuPath.length - 1;
				if (lastItem) {
					await click(page, elementHandle);
				} else {
					await hover(page, elementHandle);
				}
			}
		},
	});
}

/**
 * Clicks the create asset button in the project window and clicks the specified
 * asset from the context menu. It then waits for the created asset to appear
 * in the project window.
 *
 * @param {import("puppeteer").Page} page
 * @param {Deno.TestContext} testContext
 * @param {string[]} createMenuPath The path of the context menu item that creates the asset.
 * @param {string[]} createdAssetPath The expected file location of the created asset.
 */
export async function createAsset(page, testContext, createMenuPath, createdAssetPath) {
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

	const projectRootTreeViewEl = await projectEl.$(".editorContentWindowContent > .treeViewItem");
	if (!projectRootTreeViewEl) {
		throw new Error("Project root treeview element not found.");
	}
	await getTreeViewItemElement(page, projectRootTreeViewEl, createdAssetPath);
}
