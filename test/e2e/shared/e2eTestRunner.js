import * as path from "std/path/mod.ts";
import * as fs from "std/fs/mod.ts";
import {DevServer} from "../../../scripts/DevServer.js";
import {setMainPageUrl} from "./browser.js";
import {popFailedTests, setPath} from "./runE2eTest.js";
// import {parseArgs} from "../../shared/testArgs.js";
import {gray, red} from "std/fmt/colors.ts";
import {setCwd} from "chdir-anywhere";
setCwd();
Deno.chdir("../../..");

// const {headless} = parseArgs();

const e2eTestsDir = path.resolve("test/e2e");
const testFiles = [];
for await (const entry of fs.walk(e2eTestsDir)) {
	if (entry.isFile && entry.path.endsWith(".test.js")) {
		testFiles.push(entry.path);
	}
}

// Start test server
// const testServer = new DevServer({
// 	port: 0,
// 	serverName: "test server",
// });
// testServer.start();
// const testServerAddrs = testServer.getAddrs();
// if (testServerAddrs.length <= 0) {
// 	throw new Error("Failed to get test server url.");
// }

// setMainPageUrl(testServerAddrs[0]);

const filterPaths = [];
for (const arg of Deno.args) {
	if (arg.startsWith("test/e2e")) {
		filterPaths.push(arg);
	}
}

/**
 * @typedef FailedTestsData
 * @property {string} path
 * @property {string[]} failedTestNames
 */

/** @type {FailedTestsData[]} */
const failedTests = [];

for (const testFilePath of testFiles) {
	const relativePath = path.relative(".", testFilePath);
	if (filterPaths.length > 0) {
		let found = false;
		for (const filterPath of filterPaths) {
			if (relativePath.startsWith(filterPath)) {
				found = true;
				break;
			}
		}
		if (!found) {
			continue;
		}
	}
	setPath(relativePath);
	const importUrl = path.toFileUrl(testFilePath);
	await import(importUrl.href);
	const fileFailedTests = popFailedTests();
	if (fileFailedTests.length > 0) {
		failedTests.push({
			path: relativePath,
			failedTestNames: fileFailedTests,
		});
	}
}

// testServer.close();

if (failedTests.length > 0) {
	console.log(red("Some tests failed"));
	for (const failedTest of failedTests) {
		console.log(`  ${gray(failedTest.path)}`);
		for (const failedTestName of failedTest.failedTestNames) {
			console.log(`  ${failedTestName}`);
		}
	}
	Deno.exit(1);
}
