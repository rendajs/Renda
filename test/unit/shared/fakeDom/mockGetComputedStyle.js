const original = globalThis.getComputedStyle;

/**
 * @param {import("./FakeHtmlElement.js").FakeHtmlElement & HTMLElement} el
 */
function fakeGetComputedStyle(el) {
	return el.style;
}

export function installMockGetComputedStyle() {
	globalThis.getComputedStyle = /** @type {typeof getComputedStyle} */(fakeGetComputedStyle);
}

export function uninstallMockGetComputedStyle() {
	globalThis.getComputedStyle = original;
}
