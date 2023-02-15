import {log} from "../../shared/log.js";

/**
 * @param {import("puppeteer").Page} page
 */
export async function reloadPage(page) {
	log("Reload the page");
	await page.reload();
}
