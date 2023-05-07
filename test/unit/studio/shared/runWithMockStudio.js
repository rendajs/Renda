
// I tried combining these two functions into one, but that doesn't work because
// it will cause tests with non async functions to throw outside of the test.
// That way Deno's test runner is not able to know which test the error originated from.

import {injectMockStudioInstance} from "../../../../studio/src/studioInstance.js";

/**
 * Runs the function with an installed fake dom.
 * Ensures global scope is cleaned up after running, even if errors are thrown.
 * @param {import("../../../../studio/src/Studio.js").Studio} studioInstance
 * @param {() => void | undefined} fn
 */
export function runWithMockStudio(studioInstance, fn) {
	injectMockStudioInstance(studioInstance);

	try {
		fn();
	} finally {
		injectMockStudioInstance(null);
	}
}

/**
 * Same as {@linkcode runWithMockStudio} but async.
 * @param {import("../../../../studio/src/Studio.js").Studio} studioInstance
 * @param {() => (Promise<void>)} fn
 */
export async function runWithMockStudioAsync(studioInstance, fn) {
	injectMockStudioInstance(studioInstance);

	try {
		await fn();
	} finally {
		injectMockStudioInstance(null);
	}
}
