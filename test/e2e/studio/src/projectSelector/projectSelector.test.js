import {assert, assertEquals, assertExists} from "std/testing/asserts.ts";
import {log} from "../../../shared/log.js";
import {runE2eTest} from "../../../shared/runE2eTest.js";
import {click} from "../../../shared/util.js";
import {createAsset, getAssetTreeView, waitForAssetExists} from "../../shared/assets.js";
import {getMaybeContentWindowConnectionsElement, waitForContentWindowConnectionsElement} from "../../shared/contentWindows/connections.js";
import {clickContextMenuItem} from "../../shared/contextMenu.js";
import {openProjectSelector, setupNewProject, waitForProjectOpen, waitForProjectSelector} from "../../shared/project.js";
import {reloadPage} from "../../shared/reloadPage.js";
import {waitForStudioLoad} from "../../shared/studio.js";
import {waitSeconds} from "../../shared/waitSeconds.js";
import {getPage} from "../../../shared/browser.js";

await runE2eTest({
	name: "Rename a project and refresh the page, it should open the latest project",
	async fn() {
		const {page} = await getPage();
		const newProjectName = "New Project Name";
		const projectWindowSelector = "[data-content-window-type-id='renda:project']";
		const rootNameTreeViewSelector = `${projectWindowSelector} .studio-content-window-content > .tree-view-item`;

		await setupNewProject(page);

		log("Rename the project root folder");
		const projectNameEl = await page.waitForSelector(rootNameTreeViewSelector);
		assertExists(projectNameEl);
		await projectNameEl.click();

		await page.keyboard.press("Enter");
		await page.keyboard.type(newProjectName);
		await page.keyboard.press("Enter");

		await waitSeconds(1);
		await reloadPage(page);

		await waitForProjectOpen(page);

		log("Check if the project loaded with the changed name");
		{
			const contentWindowProjectEl = await page.waitForSelector(projectWindowSelector);
			assertExists(contentWindowProjectEl);

			await contentWindowProjectEl.evaluate(async contentWindowProjectEl => {
				if (!globalThis.studio) throw new Error("Studio instance does not exist");
				if (!(contentWindowProjectEl instanceof HTMLElement)) throw new Error("Assertion failed, contentWindowProjectEl is not a HTMLElement");
				const contentWindowProject = globalThis.studio.windowManager.getWindowByElement(contentWindowProjectEl);
				if (!contentWindowProject) throw new Error("No project window found");
				const ContentWindowProjectConstructor = globalThis.studio.windowManager.registeredContentWindows.get("renda:project");
				const ContentWindowProject = /** @type {typeof import("../../../../../studio/src/windowManagement/contentWindows/ContentWindowProject.js").ContentWindowProject} */ (ContentWindowProjectConstructor);
				if (!(contentWindowProject instanceof ContentWindowProject)) {
					throw new Error("content window is not of type project");
				}
				await contentWindowProject.waitForInit();
			});

			const projectNameEl = await page.waitForSelector(rootNameTreeViewSelector);
			if (!projectNameEl) throw new Error("Project name element not found.");
			const projectName = await projectNameEl.evaluate(projectNameEl => {
				return projectNameEl.textContent;
			});
			assertEquals(projectName, newProjectName);
		}
	},
});

await runE2eTest({
	name: "Empty db projects do not persist",
	async fn() {
		const {page} = await getPage();
		await setupNewProject(page);

		// Since what we're testing for can be triggered by anything, there's
		// no good way to wait for something specific, so we'll just wait 5 seconds,
		// this should catch most cases
		await waitSeconds(5);

		await reloadPage(page);
		await waitForProjectOpen(page);

		const exists = await page.evaluate(async () => {
			if (!globalThis.studio) throw new Error("Studio instance does not exist");
			return await globalThis.studio.projectManager.currentProjectFileSystem?.isFile([".renda", "localProjectSettings.json"]);
		});

		assert(!exists, "Expected localProjectSettings.json to not exist");
	},
});

await runE2eTest({
	name: "Deleting db project closes it if it currently open",
	async fn() {
		const {page} = await getPage();
		await setupNewProject(page);

		// Create an asset to mark the project as isWorthSaving
		await createAsset(page, ["New Entity"]);
		await getAssetTreeView(page, ["New Entity.json"]);

		const projectSelectorEl = await openProjectSelector(page);

		await click(projectSelectorEl, ".project-selector-recent-list-container > .project-selector-list > li:nth-child(1) > button", {
			button: "right",
		});
		page.on("dialog", async dialog => {
			await dialog.accept();
		});
		await clickContextMenuItem(page, ["Delete"]);
		log("Wait for new project to be created");
		await waitForAssetExists(page, false, ["New Entity.json"]);
	},
});

await runE2eTest({
	name: "Connect remote project opens the connections window",
	async fn() {
		const {page} = await getPage();
		const projectSelectorEl = await waitForProjectSelector(page);
		await waitForStudioLoad(page);

		// Verify that the connections window doesn't exist yet.
		// If we ever end up changing the default workspace in the future
		// the connections content window might already exist, rendering this test useless.
		const connectionsEl = await getMaybeContentWindowConnectionsElement(page);
		assertEquals(connectionsEl, null);

		await click(projectSelectorEl, ".project-selector-actions-list-container > .project-selector-list > li:nth-child(3) > button");
		await waitForContentWindowConnectionsElement(page);
	},
});
