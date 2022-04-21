/**
 * @param {import("puppeteer").Page} page
 * @param {Deno.TestContext} testContext
 */
export async function waitForEditorLoad(page, testContext) {
	await testContext.step("Wait for editor to load", async () => {
		await page.evaluate(async () => {
			await globalThis.projectSelector.waitForEditor();
		});
	});
}
