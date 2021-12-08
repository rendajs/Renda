import {JSDOM} from "jsdom";

export function initializeDom() {
	const jsdom = new JSDOM();
	globalThis.document = jsdom.window.document;
	return jsdom.window;
}
