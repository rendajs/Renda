import {bgRed, gray, green, red, yellow} from "std/fmt/colors.ts";
import {getContext} from "./browser.js";

/**
 * @typedef E2eTestConfig
 * @property {string} name
 * @property {boolean} [ignore]
 * @property {(ctx: E2eTestContext) => Promise<void> | void} fn
 */

/**
 * @typedef E2eTestContext
 * @property {import("puppeteer").Page} page
 */

let currentPath = "";
/**
 * @param {string} path
 */
export function setPath(path) {
	currentPath = path;
}

/** @type {string[]} */
let failedTests = [];

const MAX_ATTEMPTS = 10;
const REQUIRED_SUCCESS_RATE = 0.7;

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
			const {page, disconnect} = await getContext();
			const testPromise = (async () => {
				try {
					await config.fn({page});
				} catch (e) {
					if (testFinished) return;
					ok = false;
					lastError = e;
				}
				testFinished = true;
			})();
			let createdTimeout;
			const timeoutPromise = (async () => {
				await new Promise(resolve => {
					createdTimeout = setTimeout(resolve, 30_000);
				});
				if (testFinished) return;
				testFinished = true;
				ok = false;
				lastError = new Error("Test timed out");
			})();
			await Promise.race([testPromise, timeoutPromise]);
			clearTimeout(createdTimeout);
			await disconnect();
			if (ok) successCount++;
			attempts++;
			if (attempts > 1 || !ok) {
				const status = ok ? green("ok") : red("error");
				console.log(`attempt ${attempts} ${status}`);
			}

			if (attempts >= MAX_ATTEMPTS) break;

			// If enough runs have succeeded, we can stop
			if (successCount / attempts > REQUIRED_SUCCESS_RATE) {
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
