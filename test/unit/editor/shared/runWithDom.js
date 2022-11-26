import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";

/**
 * Runs the function with an installed fake dom.
 * Ensures global scope is cleaned up after running, even if errors are thrown.
 * @param {() => void} fn
 */
export function runWithDom(fn) {
	installFakeDocument();

	try {
		fn();
	} finally {
		uninstallFakeDocument();
	}
}
