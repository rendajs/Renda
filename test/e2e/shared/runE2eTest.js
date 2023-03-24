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

let isRunningTest = false;
/**
 * @param {E2eTestConfig} config
 */
export async function runE2eTest(config) {
	if (isRunningTest) {
		throw new Error("Cannot run multiple e2e tests at the same time. Make sure to await the `runE2eTest` call.");
	}
	isRunningTest = true;
	console.log(gray(currentPath));
	console.log(`${gray("TEST: ")}${config.name}...`);
	let status;
	if (config.ignore) {
		status = yellow("ignored");
	} else {
		let ok = true;
		try {
			await config.fn();
		} catch (e) {
			ok = false;
			if (e instanceof Error) {
				console.log(`${bgRed(e.name)} ${e.message}\n${e.stack}`);
			} else {
				console.log(`${bgRed("ERROR")} ${e}`);
			}
			failedTests.push(config.name);
		}
		status = ok ? green("ok") : red("error");
	}
	console.log(`${config.name} ${status}`);
	isRunningTest = false;
}

export function popFailedTests() {
	const copy = failedTests;
	failedTests = [];
	return copy;
}
