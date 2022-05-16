// This type has its own closure in order to not export the type.
// See https://github.com/microsoft/TypeScript/issues/46011 and
// https://github.com/microsoft/TypeScript/issues/43869.
//
{
	/** @typedef {typeof import("../../../../editor/src/windowManagement/contentWindows/ContentWindow.js").ContentWindow} ContentWindow */
}

/**
 * Gets the first content window element of a given type.
 * @param {import("puppeteer").Page} page
 * @param {string} contentWindowType The static `contentWindowTypeId` property of the content window. See {@linkcode ContentWindow.contentWindowTypeId}.
 */
export async function getContentWindowElement(page, contentWindowType) {
	const el = await page.evaluateHandle(async contentWindowType => {
		if (!globalThis.editor) throw new Error("Editor instance does not exist");
		const array = Array.from(globalThis.editor.windowManager.getContentWindowsByType(contentWindowType));
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
		if (!globalThis.editor) throw new Error("Editor instance does not exist");
		const contentWindowReference = globalThis.editor.windowManager.getWindowByElement(el);
		return contentWindowReference;
	}, el);
	if (!reference) {
		throw new Error("Unable to get content window reference.");
	}
	return reference;
}
