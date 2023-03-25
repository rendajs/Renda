import {getContext} from "../../../shared/browser.js";
import {click} from "../../../shared/util.js";
import {setupNewProject} from "../../shared/project.js";
import {clickContextMenuItem} from "../../shared/contextMenu.js";
import {assertEquals} from "std/testing/asserts.ts";
import {runE2eTest} from "../../../shared/runE2eTest.js";

/**
 * Right clicks the first found tab element of a content window.
 * @param {import("puppeteer").Page} page
 */
async function rightClickTabButton(page) {
	console.log("Right click content window tab buttons");
	await click(page, ".studio-window-tab-button-group > .button", {
		button: "right",
	});
}

/**
 * @param {import("puppeteer").Page} page
 */
async function waitForWorkspaceLoad(page) {
	await page.evaluate(async () => {
		if (!globalThis.studio) throw new Error("Studio instance does not exist");
		await globalThis.studio.windowManager.reloadWorkspaceInstance.waitForFinish();
	});
}

/**
 * @param {import("puppeteer").Page} page
 */
async function getFirstTabGroupTypes(page) {
	const groupEl = await page.$(".studio-window-tab-button-group");
	if (!groupEl) throw new Error("No button group was found");
	return await groupEl.evaluate(async groupEl => {
		const arr = Array.from(groupEl.children);
		return arr.map(child => child.getAttribute("title"));
	});
}

await runE2eTest({
	name: "Adding a new workspace and switching between them",
	async fn() {
		const {page, disconnect} = await getContext();

		try {
			let workspaceIndex = 0;
			page.on("dialog", async dialog => {
				workspaceIndex++;
				await dialog.accept("workspace" + workspaceIndex);
			});

			await setupNewProject(page);

			// Sanity check to verify that the default workspace is what we expect.
			// If you just changed the default workspace layout or content window names and this test fails,
			// all you should have to do is update the tab types from the top left content window.
			const FIRST_TAB_TYPE = "Outliner";
			const SECOND_TAB_TYPE = "Default Asset Links";
			const result1 = await getFirstTabGroupTypes(page);
			assertEquals(result1, [FIRST_TAB_TYPE, SECOND_TAB_TYPE]);

			await rightClickTabButton(page);

			console.log("Add new workspace");
			await clickContextMenuItem(page, ["Workspaces", "Add New Workspace"]);
			await waitForWorkspaceLoad(page);

			await rightClickTabButton(page);
			await clickContextMenuItem(page, ["Close Tab"]);

			const result2 = await getFirstTabGroupTypes(page);
			assertEquals(result2, [SECOND_TAB_TYPE]);

			console.log("Activate default workspace");
			await rightClickTabButton(page);
			await clickContextMenuItem(page, ["Workspaces", "Default", "Activate"]);
			await waitForWorkspaceLoad(page);

			const result3 = await getFirstTabGroupTypes(page);
			assertEquals(result3, [FIRST_TAB_TYPE, SECOND_TAB_TYPE]);

			console.log("Activate the new workspace again");
			await rightClickTabButton(page);
			await clickContextMenuItem(page, ["Workspaces", "workspace1", "Activate"]);
			await waitForWorkspaceLoad(page);

			const result4 = await getFirstTabGroupTypes(page);
			assertEquals(result4, [SECOND_TAB_TYPE]);
		} finally {
			await disconnect();
		}
	},
});
