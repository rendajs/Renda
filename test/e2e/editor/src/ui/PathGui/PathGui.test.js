import {assertEquals} from "std/testing/asserts.ts";
import {openBasicScriptPage, puppeteerSanitizers} from "../../../../shared/browser.js";
import {waitFor} from "../../../../shared/util.js";

Deno.test({
	name: "Setting and getting a value",
	...puppeteerSanitizers,
	async fn() {
		const {page, disconnect} = await openBasicScriptPage("./browserContent/basic.js", import.meta.url);
		const el = await waitFor(page, "div[role='textbox']");
		const gui = await page.evaluateHandle(() => {
			const g1 = /** @type {unknown} */ (globalThis);
			const g2 = /** @type {{gui: import("../../../../../../editor/src/ui/PathGui.js").PathGui}} */ (g1);
			return g2.gui;
		});
		const childCount1 = await page.evaluate(el => el.childNodes.length, el);
		assertEquals(childCount1, 0);
		const textContent1 = await page.evaluate(el => el.textContent, el);
		assertEquals(textContent1, "");

		await page.evaluate(gui => gui.setValue(["test1", "test2"]), gui);
		const childCount2 = await page.evaluate(el => el.childNodes.length, el);
		assertEquals(childCount2, 3);
		const textContent2 = await page.evaluate(el => el.textContent, el);
		assertEquals(textContent2, "test1/test2");

		await page.evaluate(gui => gui.setValue([]), gui);
		const childCount4 = await page.evaluate(el => el.childNodes.length, el);
		assertEquals(childCount4, 1);
		const textContent4 = await page.evaluate(el => el.textContent, el);
		assertEquals(textContent4, "");

		await page.evaluate(el => {
			if (!(el instanceof HTMLElement)) throw new Error("Assertion failed, element is not a htmlelement");
			el.focus();
		}, el);
		await page.keyboard.type("test3/test4");
		const childCount5 = await page.evaluate(el => el.childNodes.length, el);
		assertEquals(childCount5, 3);
		const textContent5 = await page.evaluate(el => el.textContent, el);
		assertEquals(textContent5, "test3/test4");

		// Test if the caret is still at the end of the text box
		const lastChar = await page.evaluate(() => {
			const selection = getSelection();
			if (!selection) return "";
			// @ts-expect-error
			selection.modify("extend", "left", "character");
			return selection.toString();
		});
		assertEquals(lastChar, "4");

		await disconnect();
	},
});
