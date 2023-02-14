/**
 * @param {import("puppeteer").Page} page
 * @param {Deno.TestContext} testContext
 */
export async function waitForStudioLoad(page, testContext) {
	await testContext.step("Wait for studio to load", async () => {
		await page.evaluate(async () => {
			await globalThis.projectSelector.waitForStudio();
		});
	});
}
