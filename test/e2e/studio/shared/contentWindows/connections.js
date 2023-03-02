import {getContentWindowElement, waitForContentWindowElement} from "../contentWindows.js";

/**
 * Gets a reference to the first available ContentWindowConnections instance.
 * @param {import("puppeteer").Page} page
 */
export async function waitForContentWindowConnectionsElement(page) {
	return await waitForContentWindowElement(page, "connections");
}

/**
 * Gets a reference to the first available ContentWindowConnections instance.
 * @param {import("puppeteer").Page} page
 */
export async function getMaybeContentWindowConnectionsElement(page) {
	return await getContentWindowElement(page, "connections", {
		assertExists: false,
	});
}
