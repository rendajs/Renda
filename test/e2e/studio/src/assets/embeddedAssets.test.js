import {assertEquals, assertExists} from "std/testing/asserts.ts";
import {log} from "../../../shared/log.js";
import {runE2eTest} from "../../../shared/runE2eTest.js";
import {click} from "../../../shared/util.js";
import {clickAsset, createAsset} from "../../shared/assets.js";
import {getPropertiesAssetContentReference, getPropertiesWindowContentAsset} from "../../shared/contentWindows/properties.js";
import {clickContextMenuItem} from "../../shared/contextMenu.js";
import {createEmbeddedAssetAndOpen, openDroppableGuiTreeViewEntry} from "../../shared/droppableGui.js";
import {setupNewProject, waitForProjectOpen} from "../../shared/project.js";
import {reloadPage} from "../../shared/reloadPage.js";
import {getPropertiesTreeViewEntryValueEl, getTreeViewItemElement} from "../../shared/treeView.js";
import {getPage} from "../../../shared/browser.js";

const MATERIAL_ASSET_PATH = ["New Material.json"];

/**
 * @param {import("puppeteer").Page} page
 * @param {import("puppeteer").ElementHandle} assetContentEl
 */
async function findMapTreeViewEntry(page, assetContentEl) {
	return await getTreeViewItemElement(page, assetContentEl, [0, "Material", "Material Map"]);
}

await runE2eTest({
	name: "Creating a new material asset with embedded map and pipeline config",
	forceRunCount: 100,
	async fn() {
		const {page} = await getPage();
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

		log("Find material map tree view entry");
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

		async function logMaterial() {
			const fileContents = await page.evaluate(() => {
				const studio = globalThis.studio;
				if (!studio) throw new Error("Assertion failed, studio is not defined");
				const fs = studio.projectManager.currentProjectFileSystem;
				if (!fs) throw new Error("Assertion failed, fs is not defined");
				return fs.readJson(["New Material.json"]);
			});
			const str = JSON.stringify(fileContents, null, 2);
			console.log(str);
		}
		await logMaterial();

		await reloadPage(page);

		await waitForProjectOpen(page);

		await logMaterial();

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
	},
});
