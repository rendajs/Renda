import {assertExists} from "std/testing/asserts";
import {getContext, initBrowser, puppeteerSanitizers} from "../../../shared/browser.js";
import {click} from "../../../shared/util.js";
import {clickContextMenuItem, createAsset, getPropertiesTreeViewEntryGui as getPropertiesTreeViewEntryValueEl, getPropertiesWindowAssetContent, getTreeViewItemElement, setupNewProject, waitForDroppableGuiHasValue} from "../../shared/common.js";

await initBrowser();

/**
 * @param {import("puppeteer").ElementHandle?} propertiesTreeViewEntryEl
 */
async function findDroppableGuiFromPropertiesTreeViewEntry(propertiesTreeViewEntryEl) {
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
async function createEmbeddedAssetAndOpen(page, testContext, propertiesTreeViewEntryEl) {
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
}

Deno.test({
	name: "Creating a new material asset with embedded map and pipeline config",
	...puppeteerSanitizers,
	async fn(testContext) {
		const {page} = await getContext();

		await setupNewProject(page, testContext);

		const {createdAssetTreeView} = await createAsset(page, testContext, ["Materials", "New Material"], ["New Material.json"]);
		await click(page, createdAssetTreeView);
		const assetContentEl = await getPropertiesWindowAssetContent(page);

		await testContext.step({
			name: "Create embedded asset",
			async fn(testContext) {
				const mapTreeViewEntry = await getTreeViewItemElement(page, assetContentEl, [0, "material", "Map"]);
				await createEmbeddedAssetAndOpen(page, testContext, mapTreeViewEntry);
			},
		});

		await testContext.step({
			name: "Add map type",
			async fn(testContext) {
				// Click the 'Add Map Type' button
				const addMapTypeEntry = await getTreeViewItemElement(page, assetContentEl, [0, 1]);
				assertExists(addMapTypeEntry);
				const addMapTypeValueEl = await getPropertiesTreeViewEntryValueEl(addMapTypeEntry);
				const addMapTypeButton = await addMapTypeValueEl.$(".button");
				assertExists(addMapTypeButton);
				await click(page, addMapTypeButton);

				await clickContextMenuItem(page, testContext, ["WebGPU Renderer"]);

				const forwardPipelineConfigTreeViewEntry = await getTreeViewItemElement(page, assetContentEl, ["", "Map Types", "", "Map Settings", "", "Forward Pipeline Config"]);
				await createEmbeddedAssetAndOpen(page, testContext, forwardPipelineConfigTreeViewEntry);
			},
		});

		// We'll change an arbitrary property to check if changes are saved
		await testContext.step({
			name: "Toggle Depth Write checkbox",
			async fn() {
				const depthWriteEntry = await getTreeViewItemElement(page, assetContentEl, [0, "Asset Values", "Depth Write Enabled"]);
				assertExists(depthWriteEntry);
				const depthWriteValueEl = await getPropertiesTreeViewEntryValueEl(depthWriteEntry);
				const checkbox = await depthWriteValueEl.$("input[type=checkbox]");
				assertExists(checkbox);
				await click(page, checkbox);
			},
		});
	},
});
