import {HtmlElement} from "./FakeHtmlElement.js";

export class FakeDocument {
	createElement() {
		return new HtmlElement();
	}
}

const originalDocument = globalThis.document;

/** @type {FakeDocument?} */
let currentFake = null;

export function installFakeDocument() {
	if (currentFake) {
		throw new Error("An existing fake document is already installed.");
	}
	const fake = new FakeDocument();
	currentFake = fake;
	globalThis.document = /** @type {any} */ (fake);
	return fake;
}

export function uninstallFakeDocument() {
	if (!currentFake) {
		throw new Error("No fake document is currently installed.");
	}
	currentFake = null;
	globalThis.document = originalDocument;
}
