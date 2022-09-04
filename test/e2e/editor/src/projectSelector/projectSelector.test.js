import {assert, assertEquals, assertExists} from "std/testing/asserts.ts";
import {getContext, initBrowser, puppeteerSanitizers} from "../../../shared/browser.js";
import {click} from "../../../shared/util.js";
import {createAsset, getAssetTreeView, getNotAssetTreeView} from "../../shared/assets.js";
import {clickContextMenuItem} from "../../shared/contextMenu.js";
import {openProjectSelector, setupNewProject, waitForProjectOpen} from "../../shared/project.js";
import {waitSeconds} from "../../shared/waitSeconds.js";

await initBrowser();

Deno.test({
	name: "Rename a project and refresh the page, it should open the latest project",
	...puppeteerSanitizers,
	fn: async testContext => {
		const {page} = await getContext();

		const newProjectName = "New Project Name";
		const projectWindowSelector = "[data-content-window-type-id='project']";
		const rootNameTreeViewSelector = `${projectWindowSelector} .editorContentWindowContent > .treeViewItem`;

		await setupNewProject(page, testContext);

		await testContext.step("Rename the project root folder", async () => {
			const projectNameEl = await page.waitForSelector(rootNameTreeViewSelector);
			assertExists(projectNameEl);
			await projectNameEl.click();

			await page.keyboard.press("Enter");
			await page.keyboard.type(newProjectName);
			await page.keyboard.press("Enter");

			// todo: wait for new name to be saved to indexeddb
			await new Promise(resolve => setTimeout(resolve, 100));
		});

		await testContext.step("Reload the page", async testContext => {
			await page.reload();

			await waitForProjectOpen(page, testContext);
		});

		await testContext.step("Check if the project loaded with the changed name", async () => {
			const contentWindowProjectEl = await page.waitForSelector(projectWindowSelector);
			assertExists(contentWindowProjectEl);

			await contentWindowProjectEl.evaluate(async contentWindowProjectEl => {
				if (!globalThis.editor) throw new Error("Editor instance does not exist");
				const contentWindowProject = globalThis.editor.windowManager.getWindowByElement(contentWindowProjectEl);
				if (!contentWindowProject) throw new Error("No project window found");
				const ContentWindowProjectConstructor = globalThis.editor.windowManager.registeredContentWindows.get("project");
				const ContentWindowProject = /** @type {typeof import("../../../../../editor/src/windowManagement/contentWindows/ContentWindowProject.js").ContentWindowProject} */ (ContentWindowProjectConstructor);
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
		});
	},
	sanitizeOps: false,
	sanitizeResources: false,
});

Deno.test({
	name: "Empty db projects do not persist",
	...puppeteerSanitizers,
	async fn(testContext) {
		const {page} = await getContext();

		await setupNewProject(page, testContext);

		// Since what we're testing for can be triggered by anything, there's
		// no good way to wait for something specific, so we'll just wait 5 seconds,
		// this should catch most cases
		await waitSeconds(testContext, 5);

		await testContext.step("Reload the page", async () => {
			await page.reload();
		});
		await waitForProjectOpen(page, testContext);

		const exists = await page.evaluate(async () => {
			if (!globalThis.editor) throw new Error("Editor instance does not exist");
			return await globalThis.editor.projectManager.currentProjectFileSystem?.isFile(["ProjectSettings", "localProjectSettings.json"]);
		});

		assert(!exists, "Expected localProjectSettings.json to not exist");
	},
});

Deno.test({
	name: "Deleting db project closes it if it currently open",
	...puppeteerSanitizers,
	async fn(testContext) {
		const {page} = await getContext();

		await setupNewProject(page, testContext);

		// Create an asset to mark the project as isWorthSaving
		await createAsset(page, testContext, ["New Entity"]);
		await getAssetTreeView(page, ["New Entity.json"]);

		const projectSelectorEl = await openProjectSelector(page, testContext);

		await click(projectSelectorEl, ".project-selector-recent-list-container > .project-selector-list > .project-selector-button:nth-child(1)", {
			button: "right",
		});
		page.on("dialog", async dialog => {
			await dialog.accept();
		});
		await clickContextMenuItem(page, testContext, ["Delete"]);
		await testContext.step({
			name: "Wait for new project to be created",
			async fn() {
				await getNotAssetTreeView(page, ["New Entity.json"]);
			},
		});
	},
});
