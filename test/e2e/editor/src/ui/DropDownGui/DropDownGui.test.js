import {assertEquals} from "asserts";
import {initBrowser, openBasicScriptPage} from "../../../../shared/browser.js";
import {waitFor} from "../../../../shared/util.js";

await initBrowser();

Deno.test({
	name: "Creates the element with the correct defaultValue",
	async fn() {
		const {page} = await openBasicScriptPage("./browserContent/defaultValue.js", import.meta.url);
		await waitFor(page, "select");
		const currentValue = await page.evaluate(() => {
			return document.querySelector("select").value;
		});

		assertEquals(currentValue, "1");
	},
});
