import {log} from "../../shared/log.js";

/**
 * @param {import("puppeteer").Page} page
 */
export async function waitForStudioLoad(page) {
	log("Wait for studio to load");
	await page.evaluate(async () => {
		await globalThis.projectSelector.waitForStudio();
	});
}
