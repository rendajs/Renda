/**
 * @param {import("@playwright/test").Page} page
 */
export async function waitForEditorLoad(page) {
	await page.evaluate(async () => {
		await globalThis.projectSelector.waitForEditor();
	});
}
