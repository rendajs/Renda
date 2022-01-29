import {click} from "../../shared/util.js";

/**
 * @param {import("https://deno.land/x/puppeteer@9.0.2/mod.ts").Page} page
 * @param {Deno.TestContext} testContext
 */
export async function waitForEditorLoad(page, testContext) {
	await testContext.step("Wait for editor to load", async () => {
		await page.evaluate(async () => {
			// @ts-expect-error
			await globalThis.projectSelector.waitForEditor();
		});
	});
}

/**
 * @param {import("https://deno.land/x/puppeteer@9.0.2/mod.ts").Page} page
 * @param {Deno.TestContext} testContext
 * @param {boolean} allowExisting Whether it should resolve immediately if a project is already open.
 */
export async function waitForProjectOpen(page, testContext, allowExisting = true) {
	await waitForEditorLoad(page, testContext);
	await testContext.step("Wait for project to open", async () => {
		// @ts-expect-error
		await page.evaluate(async allowExisting => {
			// @ts-expect-error
			await editor.projectManager.waitForProjectOpen(allowExisting);
		}, allowExisting);
	});
}

/**
 * Opens the editor page and creates a new empty project.
 * @param {import("https://deno.land/x/puppeteer@9.0.2/mod.ts").Page} page
 * @param {Deno.TestContext} testContext
 * @returns {Promise<void>} A promise that resolves when the editor is loaded and project fully opened.
 */
export async function setupNewProject(page, testContext) {
	await testContext.step({
		name: "Create a new project",
		fn: async () => {
			await click(page, ".project-selector-actions-list-container > .project-selector-list > .project-selector-button:nth-child(1)");
		},
	});

	await waitForProjectOpen(page, testContext);
}
