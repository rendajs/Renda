import { ElementHandle } from "puppeteer";
import { log } from "../../shared/log.js";

// This type has its own closure in order to not export the type.
// See https://github.com/microsoft/TypeScript/issues/46011 and
// https://github.com/microsoft/TypeScript/issues/43869.
{
	/** @typedef {typeof import("../../../../studio/src/windowManagement/contentWindows/ContentWindow.js").ContentWindow} ContentWindow */
}

/**
 * Gets the first content window element of a given type.
 * This returns the full contentWindow element, including the top button bar.
 * I.e. the element with the "studio-content-window" class.
 * @template {boolean} [TAssertExists = true]
 * @param {import("puppeteer").Page} page
 * @param {string} contentWindowType The static `contentWindowTypeId` property of the content window. See {@linkcode ContentWindow.contentWindowTypeId}.
 * @param {object} options
 * @param {TAssertExists} [options.assertExists]
 * @returns {Promise<TAssertExists extends true ? ElementHandle<HTMLDivElement> : ElementHandle<HTMLDivElement>?>}
 */
export async function getContentWindowElement(page, contentWindowType, {
	assertExists = /** @type {TAssertExists} */ (true),
} = {}) {
	const result = await page.evaluateHandle(async (contentWindowType, assertExists) => {
		if (!globalThis.e2e) throw new Error("e2e module not initialized");
		return globalThis.e2e.getContentWindowElement(contentWindowType, assertExists);
	}, contentWindowType, assertExists);
	/** @typedef {TAssertExists extends true ? ElementHandle<HTMLDivElement> : ElementHandle<HTMLDivElement>?} ReturnType */
	if (result instanceof ElementHandle) {
		return /** @type {ReturnType} */ (/** @type {unknown} */ (result));
	} else {
		const jsonValue = await result.jsonValue();
		return /** @type {ReturnType} */ (jsonValue);
	}
}

/**
 * Waits until the element of a content window type exists on the page.
 * This returns the full contentWindow element, including the top button bar.
 * I.e. the element with the "studio-content-window" class.
 *
 * @param {import("puppeteer").Page} page
 * @param {string} contentWindowType The static `contentWindowTypeId` property of the content window. See {@linkcode ContentWindow.contentWindowTypeId}.
 */
export async function waitForContentWindowElement(page, contentWindowType) {
	log(`Wait for '${contentWindowType}' content window`);
	const result = await page.waitForFunction(async contentWindowType => {
		if (!globalThis.e2e) throw new Error("e2e module not initialized");
		return globalThis.e2e.getContentWindowElement(contentWindowType, false);
	}, {}, contentWindowType);

	return /** @type {ElementHandle<HTMLDivElement>} */ (result);
}

/**
 * Gets the first content window reference of a given type.
 * @param {import("puppeteer").Page} page
 * @param {string} contentWindowType The static `contentWindowTypeId` property of the content window. See {@linkcode ContentWindow.contentWindowTypeId}.
 */
export async function getContentWindowReference(page, contentWindowType) {
	const reference = await page.evaluateHandle(contentWindowType => {
		if (!globalThis.e2e) throw new Error("e2e module not initialized");
		const el = globalThis.e2e.getContentWindowElement(contentWindowType);
		const contentWindowReference = globalThis.e2e.getContentWindowReference(el);
		if (!contentWindowReference) throw new Error(`Failed to get content window reference for "${contentWindowType}".`);
		return contentWindowReference;
	}, contentWindowType);
	return reference;
}
