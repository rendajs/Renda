/**
 * @typedef WaitForOptions
 * @property {boolean} [visible]
 * @property {boolean} [hidden]
 * @property {number} [timeout]
 */

/**
 * Gets an element from the page using a selector.
 * Throws an error if the element doesn't exist after the timeout.
 * @param {import("puppeteer").Page | import("puppeteer").ElementHandle} pageOrElement
 * @param {string} selector
 * @param {WaitForOptions} options
 */
export async function waitFor(pageOrElement, selector, options = {}) {
	const element = await pageOrElement.waitForSelector(selector, options);
	if (!element) {
		throw new Error(`Element not found. Selector: ${selector}`);
	}
	return element;
}

/**
 * Utility function for turning a selector into a handle. Many functions take
 * both a selector or a handle, so this only turns the selector into a handle
 * if it's not already a handle.
 * @param {import("puppeteer").Page} page
 * @param {string | import("puppeteer").ElementHandle} selectorOrHandle
 */
async function selectorOrHandleToHandle(page, selectorOrHandle) {
	if (typeof selectorOrHandle == "string") {
		return await waitFor(page, selectorOrHandle, { visible: true });
	} else {
		return selectorOrHandle;
	}
}

/**
 * Gets the center of an element.
 *
 * @param {import("puppeteer").Page} page
 * @param {string | import("puppeteer").ElementHandle} selectorOrHandle
 */
export async function getElementPosition(page, selectorOrHandle) {
	const element = await selectorOrHandleToHandle(page, selectorOrHandle);

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
 * @param {import("puppeteer").Page | import("puppeteer").ElementHandle} pageOrElement
 * @param {string | import("puppeteer").ElementHandle} selectorOrHandle
 * @param {import("puppeteer").ClickOptions} [clickOptions]
 */
export async function click(pageOrElement, selectorOrHandle, clickOptions = {}) {
	let element;
	if (typeof selectorOrHandle === "string") {
		element = await waitFor(pageOrElement, selectorOrHandle, { visible: true });
	} else {
		element = selectorOrHandle;
	}
	await element.click(clickOptions);
}

/**
 * Drags an element to another element and fires the appropriate events.
 * @param {import("puppeteer").Page} page
 * @param {string | import("puppeteer").ElementHandle} selectorOrHandleFrom
 * @param {string | import("puppeteer").ElementHandle} selectorOrHandleTo
 */
export async function drag(page, selectorOrHandleFrom, selectorOrHandleTo) {
	const elementFrom = await selectorOrHandleToHandle(page, selectorOrHandleFrom);
	const elementTo = await selectorOrHandleToHandle(page, selectorOrHandleTo);
	await page.evaluate((elementFrom, elementTo) => {
		/**
		 * @param {string} type
		 * @param {Element} source
		 * @param {DataTransfer} dataTransfer
		 */
		function fireEvent(type, source, dataTransfer) {
			const event = document.createEvent("CustomEvent");
			event.initCustomEvent(type, true, true, null);
			const castEvent = /** @type {CustomEvent & NotReadonly<DragEvent>} */ (event);
			const bounds = source.getBoundingClientRect();
			console.log(type, bounds);
			castEvent.clientX = (bounds.left + bounds.right) / 2;
			castEvent.clientY = (bounds.top + bounds.bottom) / 2;
			castEvent.dataTransfer = dataTransfer;
			source.dispatchEvent(event);
			return castEvent;
		}

		// We'll use a single DataTransfer instance so that the client can
		// modify it and access it in other events.
		const dataTransfer = new DataTransfer();

		fireEvent("dragstart", elementFrom, dataTransfer);
		fireEvent("drag", elementFrom, dataTransfer);
		fireEvent("dragover", elementTo, dataTransfer);
		fireEvent("drop", elementTo, dataTransfer);
		fireEvent("dragend", elementTo, dataTransfer);
	}, elementFrom, elementTo);
}
