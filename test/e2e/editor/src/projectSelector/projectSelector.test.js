import {assertEquals, assertExists} from "std/testing/asserts";
import {getContext, initBrowser, puppeteerSanitizers} from "../../../shared/browser.js";
import {setupNewProject, waitForProjectOpen} from "../../shared/project.js";

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
				const ContentWindowProject = /** @type {typeof import("../../../../../editor/src/windowManagement/contentWindows/ProjectContentWindow.js").ProjectContentWindow} */ (ContentWindowProjectConstructor);
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
