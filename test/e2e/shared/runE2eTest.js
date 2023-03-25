import {bgRed, gray, green, red, yellow} from "std/fmt/colors.ts";

/**
 * @typedef E2eTestConfig
 * @property {string} name
 * @property {boolean} [ignore]
 * @property {() => Promise<void> | void} fn
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

/**
 * @param {number} attempts
 * @param {number} successCount
 */
function isSuccessful(attempts, successCount) {
	const percentage = successCount / attempts;
	return percentage > 0.7;
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
		let lastError = null;
		while (true) {
			let ok = true;
			let attemptText = "";
			if (attempts == 0) {
				attemptText = "...";
			} else {
				attemptText = " " + gray(`(attempt ${attempts})`);
			}
			console.log(gray("TEST: ") + config.name + attemptText);
			try {
				await config.fn();
			} catch (e) {
				ok = false;
				lastError = e;
			}
			if (ok) successCount++;
			attempts++;
			if (attempts > 1 || !ok) {
				const status = ok ? green("ok") : red("error");
				console.log(`attempt ${attempts} ${status}`);
			}
			if (attempts >= 10 || isSuccessful(attempts, successCount)) {
				break;
			}
		}
		if (isSuccessful(attempts, successCount)) {
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
