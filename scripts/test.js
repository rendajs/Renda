#!/usr/bin/env -S deno run --unstable --no-check --allow-run --allow-read --allow-write --allow-env --allow-net

import {join} from "std/path/mod.ts";
import {setCwd} from "chdir-anywhere";
import {DevServer} from "./DevServer.js";
import {dev} from "./dev.js";
import {PUPPETEER_NO_HEADLESS_ARG, SEPARATE_BROWSER_PROCESSES_ARG, installIfNotInstalled, launch} from "../test/e2e/shared/browser.js";

await dev();

setCwd();
Deno.chdir("..");

const DENO_COVERAGE_DIR = ".coverage/denoCoverage";
const FAKE_IMPORTS_COVERAGE_DIR = ".coverage/fakeImportsCoverageMap";

/**
 * @param {string} path
 */
async function removeMaybeDirectory(path) {
	try {
		await Deno.remove(path, {recursive: true});
	} catch (e) {
		if (!(e instanceof Deno.errors.NotFound)) {
			throw e;
		}
	}
}

/**
 * Arguments only used by this script.
 */
const SCRIPT_ARGS = [
	"--coverage",
	"--html",
];

/**
 * Args that are passed to the tests themselves.
 */
const APPLICATION_ARGS = [
	PUPPETEER_NO_HEADLESS_ARG,
	SEPARATE_BROWSER_PROCESSES_ARG,
];

/**
 * Arguments passed in from the command line that should be passed along to the
 * deno test command.
 */
const userProvidedArgs = Deno.args.filter(arg => !SCRIPT_ARGS.includes(arg) && !APPLICATION_ARGS.includes(arg));

/**
 * If not null, only tests from a specific path should be run.
 * @type {string?}
 */
let filteredTests = null;
if (userProvidedArgs.length > 0 && !userProvidedArgs[0].startsWith("--")) {
	filteredTests = userProvidedArgs[0];
	userProvidedArgs.shift();
}

const needsUnitTests = !filteredTests || filteredTests.startsWith("test/unit");
const needsE2eTests = !filteredTests || filteredTests.startsWith("test/e2e");

/** Whether to start a new browser process for every e2e test */
const separateBrowserProcesses = Deno.args.includes(SEPARATE_BROWSER_PROCESSES_ARG);

let testServer = null;
/** @type {string[]} */
let testServerAddrs = [];
let browser = null;
if (needsE2eTests) {
	// Start test server
	testServer = new DevServer({
		port: 0,
		serverName: "test server",
	});
	testServer.start();
	testServerAddrs = testServer.getAddrs();
	if (testServerAddrs.length <= 0) {
		throw new Error("Failed to get test server url.");
	}

	// Start browser process
	let headless = true;
	if (Deno.args.includes("--no-headless") || Deno.args.includes("--inspect") || Deno.args.includes("--inspect-brk")) {
		headless = false;
	}

	const executablePath = await installIfNotInstalled();

	if (!separateBrowserProcesses) {
		browser = await launch({headless, executablePath});
	}
}

let needsCoverage = Deno.args.includes("--coverage");
const needsHtmlCoverageReport = Deno.args.includes("--html");
if (needsHtmlCoverageReport) {
	needsCoverage = true;
}

/**
 * @typedef TestCommand
 * @property {string[]} cmd
 */

/** @type {TestCommand[]} */
const testCommands = [];

// Unit tests command
if (needsUnitTests) {
	const denoTestArgs = ["deno", "test", "--no-check", "--allow-env", "--allow-read", "--allow-net", "--parallel"];
	if (needsCoverage) {
		denoTestArgs.push("--allow-write");
	}
	/** @type {Set<string>} */
	const applicationArgs = new Set();
	for (const arg of Deno.args) {
		if (APPLICATION_ARGS.includes(arg)) {
			applicationArgs.add(arg);
		}
	}
	if (needsCoverage) {
		await removeMaybeDirectory(DENO_COVERAGE_DIR);
		await removeMaybeDirectory(FAKE_IMPORTS_COVERAGE_DIR);
		denoTestArgs.push(`--coverage=${DENO_COVERAGE_DIR}`);
		const coverageMapPath = join(Deno.cwd(), FAKE_IMPORTS_COVERAGE_DIR);
		applicationArgs.add(`--fi-coverage-map=${coverageMapPath}`);
	}
	denoTestArgs.push(filteredTests || "test/unit/");
	denoTestArgs.push(...userProvidedArgs);
	const cmd = [...denoTestArgs, "--", ...applicationArgs];
	testCommands.push({cmd});
}

// E2E tests command
if (needsE2eTests) {
	const denoTestArgs = ["deno", "test", "--no-check", "--allow-env", "--allow-read", "--allow-write", "--allow-run", "--allow-net"];
	/** @type {Set<string>} */
	const applicationArgs = new Set();
	for (const arg of Deno.args) {
		if (APPLICATION_ARGS.includes(arg)) {
			applicationArgs.add(arg);
		}
	}
	if (browser) {
		applicationArgs.add(`--puppeteer-ws-endpoint=${browser.wsEndpoint()}`);
	}
	const addr = testServerAddrs[0];
	applicationArgs.add(`--test-server-addr=${addr}`);
	denoTestArgs.push(filteredTests || "test/e2e/");
	denoTestArgs.push(...userProvidedArgs);
	const cmd = [...denoTestArgs, "--", ...applicationArgs];
	testCommands.push({cmd});
}

let lastTestStatus;
for (const {cmd} of testCommands) {
	console.log(`Running: ${cmd.join(" ")}`);
	const testProcess = Deno.run({cmd});
	lastTestStatus = await testProcess.status();
	if (!lastTestStatus.success) {
		break;
	}
}

testServer?.close();

if (browser) {
	await browser.close();
}

if (lastTestStatus && !lastTestStatus.success) {
	Deno.exit(lastTestStatus.code);
}

if (needsCoverage) {
	let coverageMapExists = true;
	try {
		await Deno.stat(FAKE_IMPORTS_COVERAGE_DIR);
	} catch (e) {
		if (e instanceof Deno.errors.NotFound) {
			coverageMapExists = false;
		} else {
			throw e;
		}
	}
	if (coverageMapExists) {
		console.log("Applying fake-imports coverage map.");
		const p = Deno.run({
			cmd: ["deno", "run", "--allow-read", "--no-check", "--allow-write", "https://deno.land/x/fake_imports@v0.6.0/applyCoverageMap.js", FAKE_IMPORTS_COVERAGE_DIR, DENO_COVERAGE_DIR],
		});
		await p.status();
	}

	console.log("Generating cov.lcov...");
	const includeRegex = `^file://${Deno.cwd()}/(src|editor/src|editor/devSocket/src)`;
	const coverageProcess = Deno.run({
		cmd: ["deno", "coverage", DENO_COVERAGE_DIR, "--lcov", `--include=${includeRegex}`],
		stdout: "piped",
	});
	const lcov = await coverageProcess.output();
	const coverageStatus = await coverageProcess.status();
	if (!coverageStatus.success) {
		Deno.exit(coverageStatus.code);
	}
	await Deno.writeFile(".coverage/cov.lcov", lcov);

	if (needsHtmlCoverageReport) {
		console.log("Generating HTML coverage report...");
		let genHtmlProcess = null;
		try {
			genHtmlProcess = Deno.run({
				cmd: ["genhtml", "-o", ".coverage/html", ".coverage/cov.lcov"],
			});
		} catch {
			console.error("%cERROR%c Failed to generate html report, is lcov not installed?", "color: red", "");
			let installCmd = null;
			if (Deno.build.os == "darwin") {
				installCmd = "brew install lcov";
			}
			// I'm not sure how to install it on other platforms, feel free to add more here.
			if (installCmd) {
				console.log(`Try installing it with: %c${installCmd}`, "color: black; background-color: grey");
			}
		}
		if (genHtmlProcess) {
			const genHtmlStatus = await genHtmlProcess.status();
			if (!genHtmlStatus.success) {
				Deno.exit(genHtmlStatus.code);
			}
		}
	}
}
