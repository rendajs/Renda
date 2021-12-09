import {test} from "@playwright/test";

/**
 * @param {import("@playwright/test").Page} page
 */
export async function waitForEditorLoad(page) {
	await test.step("Wait for editor to load", async () => {
		await page.evaluate(async () => {
			await globalThis.projectSelector.waitForEditor();
		});
	});
}

/**
 * @param {import("@playwright/test").Page} page
 * @param {boolean} allowExisting Whether it should resolve immediately if a project is already open.
 */
export async function waitForProjectOpen(page, allowExisting = true) {
	await test.step("Wait for project to open", async () => {
		await page.evaluate(async allowExisting => {
			await globalThis.projectSelector.waitForEditor();
			await editor.projectManager.waitForProjectOpen(allowExisting);
		}, allowExisting);
	});
}
