import {log} from "../../shared/log.js";
import {flushProjectIndexedDb} from "./indexedDb.js";

/**
 * Reloads the page.
 * @param {import("puppeteer").Page} page
 * @param {boolean} [waitForFileOperations] If true (which is the default) this function will
 * first finish the file operations and ensure that they have been written to disk.
 * Make sure to `await` this call to prevent flakyness.
 */
export async function reloadPage(page, waitForFileOperations = true) {
	if (waitForFileOperations) {
		await flushProjectIndexedDb(page);
	}
	log("Reload the page");
	await page.reload();
}
