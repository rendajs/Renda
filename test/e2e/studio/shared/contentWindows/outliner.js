import {assertExists} from "std/testing/asserts.ts";
import {log} from "../../../shared/log.js";
import {click, waitFor} from "../../../shared/util.js";
import {getContentWindowElement, getContentWindowReference} from "../contentWindows.js";

/**
 * Gets a reference to the first available ContentWindowOutliner instance.
 * @param {import("puppeteer").Page} page
 */
export async function getContentWindowOutlinerReference(page) {
	const contentWindowReference = await getContentWindowReference(page, "renda:outliner");
	return contentWindowReference;
}

/**
 * Gets the root treeview element of the outliner window.
 * @param {import("puppeteer").Page} page
 */
export async function getOutlinerRootEntityTreeView(page) {
	const outlinerElement = await getContentWindowElement(page, "renda:outliner");
	await page.evaluate(outlinerElement => {
		console.log(outlinerElement);
	}, outlinerElement);
	const treeViewEl = await waitFor(outlinerElement, ":scope > .studio-content-window-content > .treeViewItem");
	assertExists(treeViewEl);
	return treeViewEl;
}

/**
 * Gets the button element for creating new empties from the first available outliner window.
 * @param {import("puppeteer").Page} page
 */
export async function getOutlinerCreateEmptyButton(page) {
	const outlinerElement = await getContentWindowElement(page, "renda:outliner");
	const buttonEl = await waitFor(outlinerElement, ":scope > .studio-content-window-top-button-bar > .button[title='Add Entity']");
	assertExists(buttonEl);
	return buttonEl;
}

/**
 * Clicks the button element for creating new empties from the first available outliner window.
 * @param {import("puppeteer").Page} page
 */
export async function clickCreateEmptyButton(page) {
	log("Click the create new empty button");
	const buttonEl = await getOutlinerCreateEmptyButton(page);
	await click(page, buttonEl);
}
