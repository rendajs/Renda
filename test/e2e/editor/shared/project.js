import {click, waitFor} from "../../shared/util.js";
import {getContentWindowElement} from "./contentWindows.js";
import {waitForStudioLoad} from "./studio.js";

/**
 * @param {import("puppeteer").Page} page
 * @param {Deno.TestContext} testContext
 * @param {boolean} allowExisting Whether it should resolve immediately if a project is already open.
 */
export async function waitForProjectOpen(page, testContext, allowExisting = true) {
	await waitForStudioLoad(page, testContext);
	await testContext.step("Wait for project to open", async () => {
		await page.evaluate(async allowExisting => {
			if (!globalThis.editor) throw new Error("Editor instance does not exist");
			await globalThis.editor.projectManager.waitForProjectOpen(allowExisting);
		}, allowExisting);
	});
}

/**
 * Clicks the 'Open Project' button in the project window and waits for the
 * project selector to appear.
 * @param {import("puppeteer").Page} page
 * @param {Deno.TestContext} testContext
 */
export async function openProjectSelector(page, testContext) {
	let projectSelectorEl = /** @type {import("puppeteer").ElementHandle?} */ (null);
	await testContext.step({
		name: "Open project selector",
		async fn() {
			const projectEl = await getContentWindowElement(page, "project");
			await click(projectEl, "div.editorContentWindowTopButtonBar > div:nth-child(3)");
			projectSelectorEl = await waitFor(page, ".project-selector-window");
		},
	});
	if (!projectSelectorEl) throw new Error("Failed to find project selector element.");
	return projectSelectorEl;
}

/**
 * Clicks the 'New Project' button in the project selector.
 * Make sure the project selector is already open before calling this.
 * If you just opened a new page without any cookies you should be able to call
 * this at the beginning of your test. But if you are using this in the middle
 * of your test you should call {@linkcode openProjectSelector} first.
 * @param {import("puppeteer").Page} page
 * @param {Deno.TestContext} testContext
 * @returns {Promise<void>} A promise that resolves when studio has loaded and the project fully opened.
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
