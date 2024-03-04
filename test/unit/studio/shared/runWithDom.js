import { installFakeDocument, uninstallFakeDocument } from "fake-dom/FakeDocument.js";

// I tried combining these two functions into one, but that doesn't work because
// it will cause tests with non async functions to throw outside of the test.
// That way Deno's test runner is not able to know which test the error originated from.

/**
 * Runs the function with an installed fake dom.
 * Ensures global scope is cleaned up after running, even if errors are thrown.
 * @param {() => void | undefined} fn
 */
export function runWithDom(fn) {
	installFakeDocument();

	try {
		fn();
	} finally {
		uninstallFakeDocument();
	}
}

/**
 * Same as {@linkcode runWithDom} but async.
 * @param {() => (Promise<void>)} fn
 */
export async function runWithDomAsync(fn) {
	installFakeDocument();

	try {
		await fn();
	} finally {
		uninstallFakeDocument();
	}
}
