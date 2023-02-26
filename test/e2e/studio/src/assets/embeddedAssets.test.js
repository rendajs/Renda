import {assertEquals, assertExists} from "std/testing/asserts.ts";
import {getContext, puppeteerSanitizers} from "../../../shared/browser.js";
import {log} from "../../../shared/log.js";
import {click} from "../../../shared/util.js";
import {clickAsset, createAsset} from "../../shared/assets.js";
import {getPropertiesAssetContentReference, getPropertiesWindowContentAsset} from "../../shared/contentWindows/properties.js";
import {clickContextMenuItem} from "../../shared/contextMenu.js";
import {createEmbeddedAssetAndOpen, openDroppableGuiTreeViewEntry} from "../../shared/droppableGui.js";
import {setupNewProject, waitForProjectOpen} from "../../shared/project.js";
import {reloadPage} from "../../shared/reloadPage.js";
import {getPropertiesTreeViewEntryValueEl, getTreeViewItemElement} from "../../shared/treeView.js";

const MATERIAL_ASSET_PATH = ["New Material.json"];

/**
 * @param {import("puppeteer").Page} page
 * @param {import("puppeteer").ElementHandle} assetContentEl
 */
async function findMapTreeViewEntry(page, assetContentEl) {
	return await getTreeViewItemElement(page, assetContentEl, [0, "Material", "Material Map"]);
}

Deno.test({
	name: "Creating a new material asset with embedded map and pipeline config",
	...puppeteerSanitizers,
	async fn() {
		const {page, disconnect} = await getContext();

		await setupNewProject(page);

		log("Creating the assets");
		await createAsset(page, ["Materials", "New Material"]);
		await clickAsset(page, MATERIAL_ASSET_PATH);
		const assetContentEl = await getPropertiesWindowContentAsset(page);

		const assetContentReference = await getPropertiesAssetContentReference(page);
		await page.evaluateHandle(async assetContent => {
			const {PropertiesAssetContentMaterial} = await import("../../../../../studio/src/propertiesAssetContent/PropertiesAssetContentMaterial.js");
			if (!(assetContent instanceof PropertiesAssetContentMaterial)) throw new Error("Assertion failed, assetcontent is not PropertiesAssetContentMaterial");
			await assetContent.waitForAssetLoad();
		}, assetContentReference);

		log("Create embedded asset");
		const mapTreeViewEntry = await findMapTreeViewEntry(page, assetContentEl);
		await createEmbeddedAssetAndOpen(page, mapTreeViewEntry);

		log("Add map type");
		// Click the 'Add Map Type' button
		const addMapTypeEntry = await getTreeViewItemElement(page, assetContentEl, [0, 1]);
		assertExists(addMapTypeEntry);
		const addMapTypeValueEl = await getPropertiesTreeViewEntryValueEl(addMapTypeEntry);
		const addMapTypeButton = await addMapTypeValueEl.$(".button");
		assertExists(addMapTypeButton);
		await click(page, addMapTypeButton);

		await clickContextMenuItem(page, ["WebGPU Renderer"]);

		const forwardPipelineConfigTreeViewEntry = await getTreeViewItemElement(page, assetContentEl, ["", "", "WebGPU Renderer", "", "", "Forward Pipeline Config"]);
		await createEmbeddedAssetAndOpen(page, forwardPipelineConfigTreeViewEntry);

		// We'll change an arbitrary property to check if changes are saved
		log("Toggle Depth Write checkbox");
		const depthWriteEntry = await getTreeViewItemElement(page, assetContentEl, [0, "Pipeline Config", "Depth Write Enabled"]);
		assertExists(depthWriteEntry);
		const depthWriteValueEl = await getPropertiesTreeViewEntryValueEl(depthWriteEntry);
		const checkbox = await depthWriteValueEl.$("input[type=checkbox]");
		assertExists(checkbox);
		await click(page, checkbox);

		await page.evaluate(async () => {
			const studio = globalThis.studio;
			if (!studio) return;
			const fs = studio.projectManager.currentProjectFileSystem;
			if (!fs) return;
			await fs.waitForWritesFinish();
		});

		await reloadPage(page);

		await waitForProjectOpen(page);

		log("Verify if changes were saved");
		await clickAsset(page, MATERIAL_ASSET_PATH);
		const assetContentEl2 = await getPropertiesWindowContentAsset(page);

		const mapTreeViewEntry2 = await findMapTreeViewEntry(page, assetContentEl2);
		await openDroppableGuiTreeViewEntry(page, mapTreeViewEntry2);

		const forwardPipelineConfigTreeViewEntry2 = await getTreeViewItemElement(page, assetContentEl2, ["", "", "WebGPU Renderer", "", "", "Forward Pipeline Config"]);
		await openDroppableGuiTreeViewEntry(page, forwardPipelineConfigTreeViewEntry2);

		const depthWriteEntry2 = await getTreeViewItemElement(page, assetContentEl2, [0, "Pipeline Config", "Depth Write Enabled"]);
		assertExists(depthWriteEntry2);
		const depthWriteValueEl2 = await getPropertiesTreeViewEntryValueEl(depthWriteEntry2);
		const checkbox2 = await depthWriteValueEl2.$("input[type=checkbox]");
		assertExists(checkbox2);

		const checked = await checkbox2.evaluate(checkbox => {
			if (!(checkbox instanceof HTMLInputElement)) throw new Error("Assertion failed, checkbox is not a HTMLInputElement.");
			return checkbox.checked;
		});
		assertEquals(checked, false);

		await disconnect();
	},
});
