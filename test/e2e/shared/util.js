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
 * @template T
 * @typedef {T extends import("puppeteer").ElementHandle<infer H> ? H : T} ConvertPuppeteerArgument
 */

/**
 * @template {import("puppeteer").SerializableOrJSHandle[]} T
 * @typedef {{ [K in keyof T]: ConvertPuppeteerArgument<T[K]> }} ConvertPuppeteerArguments
 */

/**
 * @template T
 * @typedef {T extends Element ? import("puppeteer").ElementHandle<T> : T} ConvertPuppeteerReturnValue
 */

// This is here to fix https://github.com/microsoft/TypeScript/issues/48179
// eslint-disable-next-line no-empty
{}

/**
 * Same as `Page.waitForFunction` but with implicit argument types.
 *
 * @template {import("puppeteer").SerializableOrJSHandle[]} A
 * @template R
 * @param {import("puppeteer").Page} page
 * @param {(...args: ConvertPuppeteerArguments<A>) => R} fn
 * @param {Parameters<import("puppeteer").Page["waitForFunction"]>[1]} options
 * @param {A} args
 */
export async function waitForFunction(page, fn, options = {}, ...args) {
	const result = await page.waitForFunction(fn, options, ...args);
	return /** @type {ConvertPuppeteerReturnValue<R>} */ (result);
}

/**
 * Gets the center of an element.
 *
 * @param {import("puppeteer").Page} page
 * @param {string | import("puppeteer").ElementHandle} selector
 */
export async function getElementPosition(page, selector) {
	let element;
	if (typeof selector === "string") {
		element = await waitFor(page, selector, {visible: true});
	} else {
		element = selector;
	}

	const boundingBox = await element.boundingBox();
	if (!boundingBox) {
		throw new Error("Element is not visible.");
	}

	return {
		x: boundingBox.x + boundingBox.width / 2,
		y: boundingBox.y + boundingBox.height / 2,
	};
}

/**
 * Waits until an element exists and moves the mouse on top of it.
 *
 * @param {import("puppeteer").Page} page
 * @param {string | import("puppeteer").ElementHandle} selector
 */
export async function hover(page, selector) {
	const position = await getElementPosition(page, selector);
	await page.mouse.move(position.x, position.y);
}

/**
 * Waits until an element exists, scrolls to it and clicks it.
 * Throws an error if the element doesn't exist after the timeout.
 * @param {import("puppeteer").Page} page
 * @param {string | import("puppeteer").ElementHandle} selector
 */
export async function click(page, selector) {
	let element;
	if (typeof selector === "string") {
		element = await waitFor(page, selector, {visible: true});
	} else {
		element = selector;
	}
	await element.click();
}
