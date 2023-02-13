// This type has its own closure in order to not export the type.
// See https://github.com/microsoft/TypeScript/issues/46011 and
// https://github.com/microsoft/TypeScript/issues/43869.
//
{
	/** @typedef {typeof import("../../../../studio/src/windowManagement/contentWindows/ContentWindow.js").ContentWindow} ContentWindow */
}

/**
 * Gets the first content window element of a given type.
 * This returns the full contentWindow element, including the top button bar.
 * I.e. the element with the "editorContentWindow" class.
 * @param {import("puppeteer").Page} page
 * @param {string} contentWindowType The static `contentWindowTypeId` property of the content window. See {@linkcode ContentWindow.contentWindowTypeId}.
 */
export async function getContentWindowElement(page, contentWindowType) {
	const el = await page.evaluateHandle(async contentWindowType => {
		if (!globalThis.studio) throw new Error("Editor instance does not exist");
		const array = Array.from(globalThis.studio.windowManager.getContentWindowsByType(contentWindowType));
		if (array.length <= 0) return null;
		const el = array[0].el;
		return el;
	}, contentWindowType);
	return /** @type {import("puppeteer").ElementHandle} */ (el);
}

/**
 * Gets the first content window reference of a given type.
 * @param {import("puppeteer").Page} page
 * @param {string} contentWindowType The static `contentWindowTypeId` property of the content window. See {@linkcode ContentWindow.contentWindowTypeId}.
 */
export async function getContentWindowReference(page, contentWindowType) {
	const el = await getContentWindowElement(page, contentWindowType);
	const reference = await page.evaluateHandle(el => {
		if (!globalThis.studio) throw new Error("Editor instance does not exist");
		if (!(el instanceof HTMLElement)) throw new Error("Assertion failed, el is not a HTMLElement.");
		const contentWindowReference = globalThis.studio.windowManager.getWindowByElement(el);
		if (!contentWindowReference) throw new Error(`Failed to get content window reference for "${contentWindowType}".`);
		return contentWindowReference;
	}, el);
	return reference;
}
