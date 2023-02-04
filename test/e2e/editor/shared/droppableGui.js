import {assertExists} from "std/testing/asserts.ts";
import {click} from "../../shared/util.js";
import {clickContextMenuItem} from "./contextMenu.js";
import {getPropertiesTreeViewEntryValueEl} from "./treeView.js";

/**
 * @param {import("puppeteer").Page} page
 * @param {import("puppeteer").ElementHandle} droppableGuiEl
 */
export async function waitForDroppableGuiHasValue(page, droppableGuiEl, hasValue = true) {
	await page.waitForFunction((droppableGuiEl, hasValue) => {
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
