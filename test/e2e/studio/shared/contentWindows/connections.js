import { ElementHandle } from "puppeteer";
import { click } from "../../../shared/util.js";
import { getContentWindowElement, waitForContentWindowElement } from "../contentWindows.js";
import { log } from "../../../shared/log.js";

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

/**
 * Checks the connections window and waits for at least one connection to be available.
 * If there is only a single connection, the connect button is clicked.
 * If there is more than one connection, an error is thrown.
 * @param {import("puppeteer").Page} page
 */
export async function clickSingleAvailableConnectButton(page) {
	log("Clicking 'Connect' button");
	const button = await page.waitForFunction(() => {
		if (!globalThis.e2e) throw new Error("e2e module not initialized");
		return globalThis.e2e.getRemoteProjectConnectButton();
	});
	if (!(button instanceof ElementHandle)) {
		throw new Error("Connect button wasn't found");
	}

	await click(page, button);
}

/**
 * Waits for an available connection to send a connection request.
 * Clicks the 'allow' button on the first connection that requests permission.
 * @param {import("puppeteer").Page} page
 */
export async function acceptFirstIncomingConnection(page) {
	log("Clicking 'Allow' button");
	const button = await page.waitForFunction(() => {
		if (!globalThis.e2e) throw new Error("e2e module not initialized");
		return globalThis.e2e.getFirstRemoteProjectAcceptButtons();
	});
	if (!(button instanceof ElementHandle)) {
		throw new Error("Allow button wasn't found");
	}
	await click(page, button);
}
