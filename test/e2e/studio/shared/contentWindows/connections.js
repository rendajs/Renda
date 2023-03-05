import {getContentWindowElement, waitForContentWindowElement} from "../contentWindows.js";

/**
 * Gets a reference to the first available ContentWindowConnections instance.
 * @param {import("puppeteer").Page} page
 */
export async function waitForContentWindowConnectionsElement(page) {
	return await waitForContentWindowElement(page, "renda:connections");
}

/**
 * Gets a reference to the first available ContentWindowConnections instance.
 * @param {import("puppeteer").Page} page
 */
export async function getMaybeContentWindowConnectionsElement(page) {
	return await getContentWindowElement(page, "renda:connections", {
		assertExists: false,
	});
}
