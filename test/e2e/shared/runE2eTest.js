import { bgRed, gray, green, red, yellow } from "std/fmt/colors.ts";
import { discardCurrentContexts } from "./browser.js";

/**
 * @typedef E2eTestConfig
 * @property {string} name
 * @property {boolean} [ignore]
 * @property {() => Promise<void> | void} fn
 * @property {number} [forceRunCount] When set, the test will be run this many times, regardless of the success rate.
 * You can use this to debug flaky tests. I.e. set it to 100 or 500 or so to check the success rate.
 *
 * This is also useful to check if your changes made a test more flaky or not.
 * Just make your changes and run it again a bunch of times, then compare the difference.
 * @property {boolean} [failFast] Useful when debugging with `forceRunCount`.
 * Causes the test to stop making attempts once it has failed.
 */

let currentPath = "";
/**
 * Sets the path that is logged for each test that is run.
 * @param {string} path
 */
export function setPath(path) {
	currentPath = path;
}

let developmentModeEnabled = true;
/**
 * When development mode is enabled, certain checks are disabled to make developing tests easier.
 * For instance, test timeouts are disabled, and tests are only attempted a single time.
 * @param {boolean} enabled
 */
export function setDevelopmentModeEnabled(enabled) {
	developmentModeEnabled = enabled;
}

/** @type {string[]} */
let failedTests = [];

const MAX_ATTEMPTS = 10;
const REQUIRED_SUCCESS_RATE = 0.7;

/**
 * @param {number} successCount
 * @param {number} attempts
 */
function wasSuccessful(successCount, attempts) {
	return successCount / attempts >= REQUIRED_SUCCESS_RATE;
}

let isRunningTest = false;
/**
 * @param {E2eTestConfig} config
 */
export async function runE2eTest(config) {
	if (isRunningTest) {
		throw new Error("Cannot run multiple e2e tests at the same time. Make sure to await the `runE2eTest` call.");
	}
	isRunningTest = true;
	console.log("\n" + gray(currentPath));
	let status;
	if (config.ignore) {
		status = yellow("ignored");
	} else {
		let attempts = 0;
		let successCount = 0;
		let lastError = /** @type {unknown} */ (null);
		let success = false;
		while (true) {
			let ok = true;
			let testFinished = false;
			let attemptText = "";
			if (attempts == 0) {
				attemptText = "...";
			} else {
				attemptText = " " + gray(`(attempt ${attempts})`);
			}
			console.log(gray("TEST: ") + config.name + attemptText);
			const testPromise = (async () => {
				try {
					await config.fn();
				} catch (e) {
					if (testFinished) return;
					ok = false;
					lastError = e;
				}
				testFinished = true;
			})();
			if (!developmentModeEnabled) {
				let createdTimeout;
				const timeoutPromise = (async () => {
					await new Promise((resolve) => {
						createdTimeout = setTimeout(resolve, 30_000);
					});
					if (testFinished) return;
					testFinished = true;
					ok = false;
					lastError = new Error("Test timed out");
				})();
				await Promise.race([testPromise, timeoutPromise]);
				clearTimeout(createdTimeout);
			} else {
				await testPromise;
			}
			await discardCurrentContexts();
			if (ok) successCount++;
			attempts++;
			if (attempts > 1 || !ok || config.failFast) {
				const status = ok ? green("ok") : red("error");
				console.log(`attempt ${attempts} ${status}`);
			}

			if (!ok && config.failFast) break;

			let forceRunCount;
			if (developmentModeEnabled) {
				forceRunCount = 1;
			} else {
				forceRunCount = config.forceRunCount;
			}
			if (forceRunCount) {
				if (attempts >= forceRunCount) {
					success = wasSuccessful(successCount, attempts);
					break;
				}
			} else {
				if (attempts >= MAX_ATTEMPTS) break;

				// If enough runs have succeeded, we can stop
				if (wasSuccessful(successCount, attempts)) {
					success = true;
					break;
				}

				// If too many runs have failed, and we're never able to reach the success rate, there's no point in continuing
				{
					const remainingAttempts = MAX_ATTEMPTS - attempts;
					const maxPossibleSuccessCount = successCount + remainingAttempts;
					const maxPossibleSuccessRate = maxPossibleSuccessCount / MAX_ATTEMPTS;
					if (maxPossibleSuccessRate <= REQUIRED_SUCCESS_RATE) {
						break;
					}
				}
			}
		}
		if (config.failFast && successCount < attempts) {
			success = false;
		}
		if (success) {
			status = green("ok");
			if (attempts > 1) {
				console.log(`Test passed ${successCount} out of ${attempts} times.`);
			}
		} else {
			if (lastError instanceof Error) {
				console.log(`${bgRed(lastError.name)} ${lastError.message}\n${lastError.stack}`);
			} else {
				console.log(`${bgRed("ERROR")} ${lastError}`);
			}
			failedTests.push(config.name);
			status = red("error");
			console.log(`Test failed too many times: failed ${attempts - successCount} out of ${attempts} times.`);
		}
	}
	console.log(`${config.name} ${status}`);
	isRunningTest = false;
}

export function popFailedTests() {
	const copy = failedTests;
	failedTests = [];
	return copy;
}
