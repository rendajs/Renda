import {log} from "../../shared/log.js";

/**
 * Waits for all operations to finish on the IndexedDB of the current project.
 * Once that is done it forcefully closes the db connection.
 *
 * You should only use this right before reloading the page! Otherwise future file operations will fail.
 * Also don't forget to `await` this call.
 * @param {import("puppeteer").Page} page
 */
export async function flushProjectIndexedDb(page) {
	log("Flushing project IndexedDB");
	await page.evaluate(() => {
		if (!globalThis.e2e) {
			throw new Error("e2e module not initialized");
		}
		console.log("running it");
		return globalThis.e2e.flushProjectIndexedDb();
	});
}
