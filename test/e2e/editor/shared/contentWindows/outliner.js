import {assertExists} from "std/testing/asserts.ts";
import {click, elementWaitForSelector} from "../../../shared/util.js";
import {getContentWindowElement, getContentWindowReference} from "../contentWindows.js";

/**
 * Gets a reference to the first available ContentWindowOutliner instance.
 * @param {import("puppeteer").Page} page
 */
export async function getContentWindowOutlinerReference(page) {
	const contentWindowReference = await getContentWindowReference(page, "outliner");
	return contentWindowReference;
}

/**
 * Gets the root treeview element of the outliner window.
 * @param {import("puppeteer").Page} page
 */
export async function getOutlinerRootEntityTreeView(page) {
	const outlinerElement = await getContentWindowElement(page, "outliner");
	await page.evaluate(outlinerElement => {
		console.log(outlinerElement);
	}, outlinerElement);
	const treeViewEl = await elementWaitForSelector(page, outlinerElement, ":scope > .editorContentWindowContent > .treeViewItem");
	assertExists(treeViewEl);
	return treeViewEl;
}

/**
 * Gets the button element for creating new empties from the first available outliner window.
 * @param {import("puppeteer").Page} page
 */
export async function getOutlinerCreateEmptyButton(page) {
	const outlinerElement = await getContentWindowElement(page, "outliner");
	const buttonEl = await elementWaitForSelector(page, outlinerElement, ":scope > .editorContentWindowTopButtonBar > .button");
	assertExists(buttonEl);
	return buttonEl;
}

/**
 * Clicks the button element for creating new empties from the first available outliner window.
 * @param {import("puppeteer").Page} page
 * @param {Deno.TestContext} testContext
 */
export async function clickCreateEmptyButton(page, testContext) {
	await testContext.step({
		name: "Click the create new empty button",
		async fn() {
			const buttonEl = await getOutlinerCreateEmptyButton(page);
			await click(page, buttonEl);
		},
	});
}
