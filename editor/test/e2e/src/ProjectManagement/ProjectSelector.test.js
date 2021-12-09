import {expect, test} from "@playwright/test";
import {waitForEditorLoad, waitForProjectOpen} from "../../shared/waitForEditorLoad.js";

/**
 * Opens the editor page and creates a new empty project.
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<void>} A promise that resolves when the editor is loaded and project fully opened.
 */
async function setupNewProject(page) {
	await test.step("Create a new project", async () => {
		await page.goto(".");
		const newProjectLocator = page.locator(".project-selector-actions-list-container > .project-selector-list > .project-selector-button >> text=New Project");
		newProjectLocator.click();
	});

	await waitForEditorLoad(page);
	await waitForProjectOpen(page);
}

test("Project selector should hide when creating a new project.", async ({page}) => {
	await setupNewProject(page);

	await page.waitForSelector(".project-selector-window", {
		state: "hidden",
		timeout: 1000,
	});
});

test("It should open the most recent project on page load", async ({page}) => {
	const newProjectName = "New Project Name";
	const contentWindowProjectLocator = page.locator("[data-content-window-type-id='project']");
	const projectNameLocator = contentWindowProjectLocator.locator(".editorContentWindowContent > .treeViewItem");

	await setupNewProject(page);

	await test.step("Rename the project root folder", async () => {
		await projectNameLocator.click();

		await page.keyboard.press("Enter");
		await page.keyboard.type(newProjectName);
		await page.keyboard.press("Enter");

		// todo: fix enter key not submitting the new name
		await page.click("body");

		// todo: wait for new name to be saved to indexeddb
		await new Promise(resolve => setTimeout(resolve, 100));
	});

	await test.step("Reload the page", async () => {
		await page.reload();

		await waitForEditorLoad(page);
		await waitForProjectOpen(page);
	});

	await test.step("Check if the project loaded with the changed name", async () => {
		const contentWindowProjectEl = await contentWindowProjectLocator.elementHandle();

		await contentWindowProjectEl.evaluate(async contentWindowProjectEl => {
			const contentWindowProject = editor.windowManager.getWindowByElement(contentWindowProjectEl);
			await contentWindowProject.waitForInit();
		});

		const projectName = await projectNameLocator.textContent();
		expect(projectName).toBe(newProjectName);
	});
});
