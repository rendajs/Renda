import {assertEquals} from "std/testing/asserts.ts";
import {openBasicScriptPage, puppeteerSanitizers} from "../../../../shared/browser.js";
import {waitFor} from "../../../../shared/util.js";

Deno.test({
	name: "Creates the element with the correct defaultValue",
	...puppeteerSanitizers,
	async fn() {
		const {page, disconnect} = await openBasicScriptPage("./browserContent/defaultValue.js", import.meta.url);
		await waitFor(page, "select");
		const currentValue = await page.evaluate(() => {
			const el = document.querySelector("select");
			if (!el) throw new Error("No select element found");
			return el.value;
		});

		assertEquals(currentValue, "1");

		await disconnect();
	},
});
