import {assertExists} from "std/testing/asserts";
import {click, elementWaitForSelector, hover, waitForFunction} from "../../shared/util.js";

/**
 * @param {import("puppeteer").Page} page
 * @param {Deno.TestContext} testContext
 */
export async function waitForEditorLoad(page, testContext) {
	await testContext.step("Wait for editor to load", async () => {
		await page.evaluate(async () => {
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
			if (!globalThis.editor) throw new Error("Editor instance does not exist");
			await globalThis.editor.projectManager.waitForProjectOpen(allowExisting);
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
		if (!globalThis.editor) throw new Error("Editor instance does not exist");
		const array = Array.from(globalThis.editor.windowManager.getContentWindowsByType(contentWindowType));
		if (array.length <= 0) return null;
		const el = array[0].el;
		return el;
	}, contentWindowType);
	return /** @type {import("puppeteer").ElementHandle} */ (el);
}

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
	const result = await waitForFunction(page, (treeViewElement, itemsPath) => {
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
				if (!globalThis.editor) throw new Error("Editor instance does not exist");
				return globalThis.editor.contextMenuManager.current;
			});
			for (let i = 0; i < menuPath.length; i++) {
				const itemName = menuPath[i];
				const expectedSubmenuCount = i;
				const jsHandle = await page.evaluateHandle(async (itemName, expectedSubmenuCount, menuPath) => {
					if (!globalThis.editor) throw new Error("Editor instance does not exist");
					if (!globalThis.editor.contextMenuManager.current) throw new Error("Context menu no longer exists");
					// Submenus only get created when hovering over them. So we
					// can just recurse down all the existing menus and then
					// return the element from the last submenu.
					let submenuCount = 0;
					let currentMenu = globalThis.editor.contextMenuManager.current;
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
 * Finds the project window and searches for the specified asset treeview element.
 * @param {import("puppeteer").Page} page
 * @param {string[]} assetPath
 */
export async function getAssetTreeView(page, assetPath) {
	const projectEl = await getContentWindowElement(page, "project");
	const projectRootTreeViewEl = await projectEl.$(":scope > .editorContentWindowContent > .treeViewItem");
	if (!projectRootTreeViewEl) {
		throw new Error("Project root treeview element not found.");
	}
	return await getTreeViewItemElement(page, projectRootTreeViewEl, assetPath);
}

/**
 * @param {import("puppeteer").Page} page
 * @param {Deno.TestContext} testContext
 * @param {string[]} assetPath
 */
export async function clickAsset(page, testContext, assetPath) {
	const joinedPath = assetPath.join("/");
	await testContext.step({
		name: `Click asset "${joinedPath}"`,
		async fn() {
			const createdAssetTreeView = await getAssetTreeView(page, assetPath);
			await click(page, createdAssetTreeView);
		},
	});
}

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
export async function getPropertiesWindowAssetContent(page) {
	const propertiesRootTreeView = await getPropertiesWindowRootTreeView(page);
	const assetContentEl = await getTreeViewItemElement(page, propertiesRootTreeView, ["Asset content will be placed here"]);
	assertExists(assetContentEl);
	return assetContentEl;
}

/**
 * @param {import("puppeteer").ElementHandle} element
 */
export async function getPropertiesTreeViewEntryValueEl(element) {
	const guiEl = await element.$(":scope > .treeViewCustomEl.guiTreeViewEntry > .guiTreeViewEntryValue");
	assertExists(guiEl);
	return guiEl;
}

/**
 * @param {import("puppeteer").Page} page
 * @param {import("puppeteer").ElementHandle} droppableGuiEl
 */
export async function waitForDroppableGuiHasValue(page, droppableGuiEl, hasValue = true) {
	await waitForFunction(page, (droppableGuiEl, hasValue) => {
		return droppableGuiEl.classList.contains("filled") == hasValue;
	}, {}, droppableGuiEl, hasValue);
}

/**
 * @param {import("puppeteer").ElementHandle?} propertiesTreeViewEntryEl
 */
export async function findDroppableGuiFromPropertiesTreeViewEntry(propertiesTreeViewEntryEl) {
	assertExists(propertiesTreeViewEntryEl);
	const entryValueEl = await getPropertiesTreeViewEntryValueEl(propertiesTreeViewEntryEl);
	const droppableGuiEl = await entryValueEl.$(".droppableGui");
	assertExists(droppableGuiEl);
	return droppableGuiEl;
}

/**
 * Right clicks the droppable gui of a properties treeview entry, and creates
 * an embedded asset. Waits until the asset is created.
 * @param {import("puppeteer").Page} page
 * @param {Deno.TestContext} testContext
 * @param {import("puppeteer").ElementHandle?} propertiesTreeViewEntryEl
 */
export async function createEmbeddedAssetAndOpen(page, testContext, propertiesTreeViewEntryEl) {
	await testContext.step({
		name: "Create embedded asset and open",
		async fn(testContext) {
			// Find the droppable gui
			const droppableGuiEl = await findDroppableGuiFromPropertiesTreeViewEntry(propertiesTreeViewEntryEl);

			// Right click the gui
			await click(page, droppableGuiEl, {
				button: "right",
			});

			// Click the create embedded asset context menu
			await clickContextMenuItem(page, testContext, ["Create embedded asset"]);
			await waitForDroppableGuiHasValue(page, droppableGuiEl);

			// Open the embedded asset
			await click(page, droppableGuiEl, {
				clickCount: 2,
			});
		},
	});
}

/**
 *
 * @param {import("puppeteer").Page} page
 * @param {Deno.TestContext} testContext
 * @param {import("puppeteer").ElementHandle?} propertiesTreeViewEntryEl
 */
export async function openDroppableGuiTreeViewEntry(page, testContext, propertiesTreeViewEntryEl) {
	const droppableGuiEl = await findDroppableGuiFromPropertiesTreeViewEntry(propertiesTreeViewEntryEl);

	// Open the embedded asset
	await click(page, droppableGuiEl, {
		clickCount: 2,
	});
}
