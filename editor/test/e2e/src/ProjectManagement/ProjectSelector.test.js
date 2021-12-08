import {test} from "@playwright/test";
import {waitForEditorLoad} from "../../shared/waitForEditorLoad.js";

test("Project selector should hide when creating a new project.", async ({page}) => {
	await page.goto(".");
	const newProjectLocator = page.locator(".project-selector-actions-list-container > .project-selector-list > .project-selector-button >> text=New Project");
	newProjectLocator.click();

	await waitForEditorLoad(page);

	await page.waitForSelector(".project-selector-window", {
		state: "hidden",
		timeout: 1000,
	});
});
