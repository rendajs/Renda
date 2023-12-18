/**
 * Gets the first content window element of a given type.
 * This returns the full contentWindow element, including the top button bar.
 * I.e. the element with the "studio-content-window" class.
 * @template {boolean} [TAssertExists = true]
 * @param {string} contentWindowType
 * @param {TAssertExists} [assertExists]
 * @returns {TAssertExists extends true ? HTMLDivElement : HTMLDivElement?}
 */
export function getContentWindowElement(contentWindowType, assertExists = /** @type {TAssertExists} */ (true)) {
	if (!globalThis.studio) throw new Error("Studio instance does not exist");
	const array = Array.from(globalThis.studio.windowManager.getContentWindows(contentWindowType));
	/** @typedef {TAssertExists extends true ? HTMLDivElement : HTMLDivElement?} ReturnType */
	if (array.length <= 0) {
		if (assertExists) {
			throw new Error(`Failed to get '${contentWindowType}' content window element because it wasn't found.`);
		} else {
			return /** @type {ReturnType} */ (null);
		}
	}
	const el = array[0].el;
	return /** @type {ReturnType} */ (el);
}

/**
 * @param {HTMLElement} el
 */
export function getContentWindowReference(el) {
	if (!globalThis.studio) throw new Error("Studio instance does not exist");
	return globalThis.studio.windowManager.getWindowByElement(el);
}
