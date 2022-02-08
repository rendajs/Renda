import {AssertionError} from "asserts";

/**
 * Make an assertion that `actual` and `expected` are almost numbers.
 * If not, then throw.
 *
 * @param {number} actual
 * @param {number} expected
 */
export function assertAlmostEquals(actual, expected, tolerance = 0.1, msg = "") {
	if (Math.abs(actual - expected) > tolerance) {
		let message = msg;
		if (!message) {
			message = `Expected value to be close to ${expected} but got ${actual}`;
		}
		throw new AssertionError(message);
	}
}
