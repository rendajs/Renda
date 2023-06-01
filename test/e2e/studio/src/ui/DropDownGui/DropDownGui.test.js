import {assertEquals} from "std/testing/asserts.ts";
import {openBasicScriptPage} from "../../../../shared/browser.js";
import {runE2eTest} from "../../../../shared/runE2eTest.js";
import {waitFor} from "../../../../shared/util.js";

await runE2eTest({
	name: "Creates the element with the correct defaultValue",
	async fn() {
		const {page, discard: disconnect} = await openBasicScriptPage("./browserContent/defaultValue.js", import.meta.url);
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


(async () => {
	throw new Error("oh no");

})();
