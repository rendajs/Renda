import {log} from "../../shared/log.js";
import {click} from "../../shared/util.js";
import {clickContextMenuItem} from "./contextMenu.js";

/**
 * Right clicks the first found tab element of a content window.
 * @param {import("puppeteer").Page} page
 */
export async function rightClickFirstContentWindowTabButton(page) {
	log("Right click content window tab buttons");
	await click(page, ".studio-window-tab-button-group > .button", {
		button: "right",
	});
}

/**
 * Opens a new content window by right clicking its tabs and
 * selecting the content window name from the context menu.
 * @param {import("puppeteer").Page} page
 * @param {string} contentWindowName The name as it appears in the context menu. For example "Entity Editor".
 */
export async function openContentWindow(page, contentWindowName) {
	await rightClickFirstContentWindowTabButton(page);
	log(`Opening "${contentWindowName}" content window`);
	await clickContextMenuItem(page, ["Add Tab", contentWindowName]);
}
