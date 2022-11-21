import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";

/**
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
