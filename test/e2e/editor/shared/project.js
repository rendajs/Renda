import {click} from "../../shared/util.js";
import {waitForEditorLoad} from "./editor.js";

/**
 * @param {import("puppeteer").Page} page
 * @param {Deno.TestContext} testContext
 * @param {boolean} allowExisting Whether it should resolve immediately if a project is already open.
 */
export async function waitForProjectOpen(page, testContext, allowExisting = true) {
	await waitForEditorLoad(page, testContext);
	await testContext.step("Wait for project to open", async () => {
		await page.evaluate(async allowExisting => {
			if (!globalThis.editor) throw new Error("Editor instance does not exist");
			await globalThis.editor.projectManager.waitForProjectOpen(allowExisting);
		}, allowExisting);
	});
}

/**
 * Opens the editor page and creates a new empty project.
 * @param {import("puppeteer").Page} page
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
