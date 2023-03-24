import {assert, assertEquals, assertExists} from "std/testing/asserts.ts";
import {getContext} from "../../../shared/browser.js";
import {log} from "../../../shared/log.js";
import {runE2eTest} from "../../../shared/runE2eTest.js";
import {click} from "../../../shared/util.js";
import {createAsset, getAssetTreeView, waitForAssetDissappear} from "../../shared/assets.js";
import {getMaybeContentWindowConnectionsElement, waitForContentWindowConnectionsElement} from "../../shared/contentWindows/connections.js";
import {clickContextMenuItem} from "../../shared/contextMenu.js";
import {openProjectSelector, setupNewProject, waitForProjectOpen, waitForProjectSelector} from "../../shared/project.js";
import {reloadPage} from "../../shared/reloadPage.js";
import {waitForStudioLoad} from "../../shared/studio.js";
import {waitSeconds} from "../../shared/waitSeconds.js";

await runE2eTest({
	name: "Rename a project and refresh the page, it should open the latest project",
	fn: async () => {
		const {page, disconnect} = await getContext();

		try {
			const newProjectName = "New Project Name";
			const projectWindowSelector = "[data-content-window-type-id='renda:project']";
			const rootNameTreeViewSelector = `${projectWindowSelector} .studio-content-window-content > .treeViewItem`;

			await setupNewProject(page);

			log("Rename the project root folder");
			const projectNameEl = await page.waitForSelector(rootNameTreeViewSelector);
			assertExists(projectNameEl);
			await projectNameEl.click();

			await page.keyboard.press("Enter");
			await page.keyboard.type(newProjectName);
			await page.keyboard.press("Enter");

			// todo: wait for new name to be saved to indexeddb
			await waitSeconds(5);

			await reloadPage(page);

			await waitForProjectOpen(page);

			log("Check if the project loaded with the changed name");
			{
				const contentWindowProjectEl = await page.waitForSelector(projectWindowSelector);
				assertExists(contentWindowProjectEl);

				await contentWindowProjectEl.evaluate(async contentWindowProjectEl => {
					if (!globalThis.studio) throw new Error("Studio instance does not exist");
					debugger;
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
		} finally {
			await disconnect();
		}
	},
});

await runE2eTest({
	name: "Empty db projects do not persist",
	async fn() {
		const {page, disconnect} = await getContext();

		try {
			await setupNewProject(page);

			// Since what we're testing for can be triggered by anything, there's
			// no good way to wait for something specific, so we'll just wait 5 seconds,
			// this should catch most cases
			await waitSeconds(5);

			await reloadPage(page);
			await waitForProjectOpen(page);

			const exists = await page.evaluate(async () => {
				if (!globalThis.studio) throw new Error("Studio instance does not exist");
				return await globalThis.studio.projectManager.currentProjectFileSystem?.isFile(["ProjectSettings", "localProjectSettings.json"]);
			});

			assert(!exists, "Expected localProjectSettings.json to not exist");
		} finally {
			await disconnect();
		}
	},
});

await runE2eTest({
	name: "Deleting db project closes it if it currently open",
	async fn() {
		const {page, disconnect} = await getContext();

		try {
			await setupNewProject(page);

			// Create an asset to mark the project as isWorthSaving
			await createAsset(page, ["New Entity"]);
			await getAssetTreeView(page, ["New Entity.json"]);

			const projectSelectorEl = await openProjectSelector(page);

			await click(projectSelectorEl, ".project-selector-recent-list-container > .project-selector-list > .project-selector-button:nth-child(1)", {
				button: "right",
			});
			page.on("dialog", async dialog => {
				await dialog.accept();
			});
			await clickContextMenuItem(page, ["Delete"]);
			log("Wait for new project to be created");
			await waitForAssetDissappear(page, ["New Entity.json"]);
		} finally {
			await disconnect();
		}
	},
});

await runE2eTest({
	name: "Connect remote project opens the connections window",
	async fn() {
		const {page, disconnect} = await getContext();

		try {
			const projectSelectorEl = await waitForProjectSelector(page);
			await waitForStudioLoad(page);

			// Verify that the connections window doesn't exist yet.
			// If we ever end up changing the default workspace in the future
			// the connections content window might already exist, rendering this test useless.
			const connectionsEl = await getMaybeContentWindowConnectionsElement(page);
			assertEquals(connectionsEl, null);

			await click(projectSelectorEl, ".project-selector-actions-list-container > .project-selector-list > .project-selector-button:nth-child(3)");
			await waitForContentWindowConnectionsElement(page);
		} finally {
			await disconnect();
		}
	},
});
