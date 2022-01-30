/**
 * @typedef WaitForOptions
 * @property {boolean} [visible]
 * @property {boolean} [hidden]
 * @property {number} [timeout]
 */

/**
 * Gets an element from the page using a selector.
 * Throws an error if the element doesn't exist after the timeout.
 * @param {import("puppeteer").Page} page
 * @param {string} selector
 * @param {WaitForOptions} options
 */
export async function waitFor(page, selector, options = {}) {
	const element = await page.waitForSelector(selector, options);
	if (!element) {
		throw new Error(`Element not found. Selector: ${selector}`);
	}
	return element;
}

/**
 * Waits until an element exists and clicks it.
 * Throws an error if the element doesn't exist after the timeout.
 * @param {import("puppeteer").Page} page
 * @param {string} selector
 */
export async function click(page, selector) {
	const element = await waitFor(page, selector, {visible: true});
	await element.click();
}
