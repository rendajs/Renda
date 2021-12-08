import {expect, test} from "@playwright/test";
import {waitForEditorLoad} from "../../shared/waitForEditorLoad.js";

/**
 * @param {import("@playwright/test").Page} page
 */
async function createNewProject(page) {
	await page.goto(".");
	const newProjectLocator = page.locator(".project-selector-actions-list-container > .project-selector-list > .project-selector-button >> text=New Project");
	newProjectLocator.click();

	await waitForEditorLoad(page);
}

test("Project selector should hide when creating a new project.", async ({page}) => {
	await createNewProject(page);

	await page.waitForSelector(".project-selector-window", {
		state: "hidden",
		timeout: 1000,
	});
});

test("It should open the most recent project on page load", async ({page}) => {
	await createNewProject(page);

	const contentWindowProjectLocator = page.locator("[data-content-window-type-id='project']");
	const projectNameLocator = contentWindowProjectLocator.locator(".editorContentWindowContent > .treeViewItem");
	await projectNameLocator.click();

	const newProjectName = "New Project Name";

	// Rename the root project folder
	await page.keyboard.press("Enter");
	await page.keyboard.type(newProjectName);
	await page.keyboard.press("Enter");

	await page.reload();

	await waitForEditorLoad(page);

	const contentWindowProjectEl = await contentWindowProjectLocator.elementHandle();

	await contentWindowProjectEl.evaluate(async contentWindowProjectEl => {
		const contentWindowProject = editor.windowManager.getWindowByElement(contentWindowProjectEl);
		await contentWindowProject.waitForInit();
	});

	const projectName = await projectNameLocator.textContent();
	expect(projectName).toBe(newProjectName);
});
