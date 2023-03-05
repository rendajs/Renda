import {ElementHandle} from "puppeteer";
import {log} from "../../shared/log.js";

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
		if (!globalThis.studio) throw new Error("Studio instance does not exist");
		const array = Array.from(globalThis.studio.windowManager.getContentWindows(contentWindowType));
		if (array.length <= 0) {
			if (assertExists) {
				throw new Error(`Failed to get '${contentWindowType}' content window element because it wasn't found.`);
			} else {
				return null;
			}
		}
		const el = array[0].el;
		return el;
	}, contentWindowType, assertExists);
	/** @typedef {TAssertExists extends true ? ElementHandle<HTMLDivElement> : ElementHandle<HTMLDivElement>?} ReturnType */
	if (result instanceof ElementHandle) {
		return /** @type {ReturnType} */ (result);
	} else {
		const jsonValue = await result.jsonValue();
		return /** @type {ReturnType} */ (jsonValue);
	}
}

/**
 * Waits until the element of a content window type exists on the page.
 * @param {import("puppeteer").Page} page
 * @param {string} contentWindowType The static `contentWindowTypeId` property of the content window. See {@linkcode ContentWindow.contentWindowTypeId}.
 */
export async function waitForContentWindowElement(page, contentWindowType) {
	log(`Wait for '${contentWindowType}' content window`);
	const result = await page.waitForFunction(async contentWindowType => {
		if (!globalThis.studio) throw new Error("Studio instance does not exist");
		const array = Array.from(globalThis.studio.windowManager.getContentWindows(contentWindowType));
		if (array.length <= 0) return null;
		const el = array[0].el;
		return el;
	}, {}, contentWindowType);

	return result;
}

/**
 * Gets the first content window reference of a given type.
 * @param {import("puppeteer").Page} page
 * @param {string} contentWindowType The static `contentWindowTypeId` property of the content window. See {@linkcode ContentWindow.contentWindowTypeId}.
 */
export async function getContentWindowReference(page, contentWindowType) {
	const el = await getContentWindowElement(page, contentWindowType);
	const reference = await page.evaluateHandle(el => {
		if (!globalThis.studio) throw new Error("Studio instance does not exist");
		if (!(el instanceof HTMLElement)) throw new Error("Assertion failed, el is not a HTMLElement.");
		const contentWindowReference = globalThis.studio.windowManager.getWindowByElement(el);
		if (!contentWindowReference) throw new Error(`Failed to get content window reference for "${contentWindowType}".`);
		return contentWindowReference;
	}, el);
	return reference;
}
