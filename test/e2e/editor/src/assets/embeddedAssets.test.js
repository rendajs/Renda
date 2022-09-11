import {assertEquals, assertExists} from "std/testing/asserts.ts";
import {getContext, puppeteerSanitizers} from "../../../shared/browser.js";
import {click} from "../../../shared/util.js";
import {clickAsset, createAsset} from "../../shared/assets.js";
import {getPropertiesAssetContentReference, getPropertiesWindowContentAsset} from "../../shared/contentWindows/properties.js";
import {clickContextMenuItem} from "../../shared/contextMenu.js";
import {createEmbeddedAssetAndOpen, openDroppableGuiTreeViewEntry} from "../../shared/droppableGui.js";
import {setupNewProject, waitForProjectOpen} from "../../shared/project.js";
import {getPropertiesTreeViewEntryValueEl, getTreeViewItemElement} from "../../shared/treeView.js";

const MATERIAL_ASSET_PATH = ["New Material.json"];

/**
 * @param {import("puppeteer").Page} page
 * @param {import("puppeteer").ElementHandle} assetContentEl
 */
async function findMapTreeViewEntry(page, assetContentEl) {
	return await getTreeViewItemElement(page, assetContentEl, [0, "material", "Map"]);
}

Deno.test({
	name: "Creating a new material asset with embedded map and pipeline config",
	...puppeteerSanitizers,
	async fn(testContext) {
		const {page, disconnect} = await getContext();

		await setupNewProject(page, testContext);

		await testContext.step({
			name: "Creating the assets",
			async fn(testContext) {
				await createAsset(page, testContext, ["Materials", "New Material"]);
				await clickAsset(page, testContext, MATERIAL_ASSET_PATH);
				const assetContentEl = await getPropertiesWindowContentAsset(page);

				const assetContentReference = await getPropertiesAssetContentReference(page);
				await page.evaluateHandle(async assetContent => {
					const {PropertiesAssetContentMaterial} = await import("../../../../../editor/src/propertiesAssetContent/PropertiesAssetContentMaterial.js");
					if (!(assetContent instanceof PropertiesAssetContentMaterial)) throw new Error("Assertion failed, assetcontent is not PropertiesAssetContentMaterial");
					await assetContent.waitForAssetLoad();
				}, assetContentReference);

				await testContext.step({
					name: "Create embedded asset",
					async fn(testContext) {
						const mapTreeViewEntry = await findMapTreeViewEntry(page, assetContentEl);
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
					async fn(testContext) {
						const depthWriteEntry = await getTreeViewItemElement(page, assetContentEl, [0, "Asset Values", "Depth Write Enabled"]);
						assertExists(depthWriteEntry);
						const depthWriteValueEl = await getPropertiesTreeViewEntryValueEl(depthWriteEntry);
						const checkbox = await depthWriteValueEl.$("input[type=checkbox]");
						assertExists(checkbox);
						await click(page, checkbox);

						await page.evaluate(async () => {
							const e = editor;
							if (!e) return;
							const fs = e.projectManager.currentProjectFileSystem;
							if (!fs) return;
							await fs.waitForWritesFinish();
						});
					},
				});
			},
		});

		await testContext.step({
			name: "Reload the page",
			async fn(testContext) {
				await page.reload();
			},
		});

		await waitForProjectOpen(page, testContext);

		await testContext.step({
			name: "Verify if changes were saved",
			async fn(testContext) {
				await clickAsset(page, testContext, MATERIAL_ASSET_PATH);
				const assetContentEl = await getPropertiesWindowContentAsset(page);

				const mapTreeViewEntry = await findMapTreeViewEntry(page, assetContentEl);
				await openDroppableGuiTreeViewEntry(page, testContext, mapTreeViewEntry);

				const forwardPipelineConfigTreeViewEntry = await getTreeViewItemElement(page, assetContentEl, ["", "Map Types", "", "Map Settings", "", "Forward Pipeline Config"]);
				await openDroppableGuiTreeViewEntry(page, testContext, forwardPipelineConfigTreeViewEntry);

				const depthWriteEntry = await getTreeViewItemElement(page, assetContentEl, [0, "Asset Values", "Depth Write Enabled"]);
				assertExists(depthWriteEntry);
				const depthWriteValueEl = await getPropertiesTreeViewEntryValueEl(depthWriteEntry);
				const checkbox = await depthWriteValueEl.$("input[type=checkbox]");
				assertExists(checkbox);

				const checked = await checkbox.evaluate(checkbox => {
					if (!(checkbox instanceof HTMLInputElement)) throw new Error("Assertion failed, checkbox is not a HTMLInputElement.");
					return checkbox.checked;
				});
				assertEquals(checked, false);
			},
		});

		await disconnect();
	},
});
