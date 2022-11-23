// @ts-nocheck
import {JSDOM} from "npm:jsdom@19.0.0";

export function initializeDom() {
	const jsdom = new JSDOM();
	globalThis.document = jsdom.window.document;
	return jsdom.window;
}
