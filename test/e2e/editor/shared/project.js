import {log} from "../../shared/log.js";
import {click, waitFor} from "../../shared/util.js";
import {getContentWindowElement} from "./contentWindows.js";
import {waitForStudioLoad} from "./studio.js";

/**
 * @param {import("puppeteer").Page} page
 * @param {boolean} allowExisting Whether it should resolve immediately if a project is already open.
 */
export async function waitForProjectOpen(page, allowExisting = true) {
	await waitForStudioLoad(page);
	log("Waiting for project to open...");
	await page.evaluate(async allowExisting => {
		if (!globalThis.studio) throw new Error("Studio instance does not exist");
		await globalThis.studio.projectManager.waitForProjectOpen(allowExisting);
	}, allowExisting);
	log("Project is open");
}

/**
 * Clicks the 'Open Project' button in the project window and waits for the
 * project selector to appear.
 * @param {import("puppeteer").Page} page
 */
export async function openProjectSelector(page) {
	let projectSelectorEl = /** @type {import("puppeteer").ElementHandle?} */ (null);
	log("Opening project selector...");
	const projectEl = await getContentWindowElement(page, "project");
	await click(projectEl, "div.studio-content-window-top-button-bar > div:nth-child(3)");
	projectSelectorEl = await waitFor(page, ".project-selector-window");
	log("Project selector is open");
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
 * @returns {Promise<void>} A promise that resolves when studio has loaded and the project fully opened.
 */
export async function setupNewProject(page) {
	log("Create a new project");
	await click(page, ".project-selector-actions-list-container > .project-selector-list > .project-selector-button:nth-child(1)");

	await waitForProjectOpen(page);
}
