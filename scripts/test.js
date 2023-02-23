#!/usr/bin/env -S deno run --unstable --no-check --allow-run --allow-read --allow-write --allow-env --allow-net

import {join} from "std/path/mod.ts";
import {setCwd} from "chdir-anywhere";
import {dev} from "./dev.js";
import {parseArgs} from "./testArgs.js";

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
 * If not null, only tests from a specific path should be run.
 * @type {string?}
 */
let filteredTests = null;
if (Deno.args.length > 0 && !Deno.args[0].startsWith("--")) {
	filteredTests = Deno.args[0];
}

const needsUnitTests = !filteredTests || filteredTests.startsWith("test/unit");
const needsE2eTests = !filteredTests || filteredTests.startsWith("test/e2e");

await dev({
	needsDependencies: needsE2eTests,
});

const {separateBrowserProcesses, inspect, headless} = parseArgs();

let testServer = null;
/** @type {string[]} */
let testServerAddrs = [];
let browser = null;
if (needsE2eTests) {
	// For now we have to keep the import specifier in a separate string in order to
	// not slow down script startup time, see https://github.com/denoland/deno/issues/17658
	const devServerSrc = "./DevServer.js";
	const {DevServer} = await import(devServerSrc);

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

	// For now we have to keep the import specifier in a separate string in order to
	// not slow down script startup time, see https://github.com/denoland/deno/issues/17658
	const browserScript = "../test/e2e/shared/browser.js";
	const {installIfNotInstalled, launch} = await import(browserScript);

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
	const applicationCmdArgs = new Set();
	if (needsCoverage) {
		await removeMaybeDirectory(DENO_COVERAGE_DIR);
		await removeMaybeDirectory(FAKE_IMPORTS_COVERAGE_DIR);
		denoTestArgs.push(`--coverage=${DENO_COVERAGE_DIR}`);
		const coverageMapPath = join(Deno.cwd(), FAKE_IMPORTS_COVERAGE_DIR);
		applicationCmdArgs.add(`--fi-coverage-map=${coverageMapPath}`);
	}
	denoTestArgs.push(filteredTests || "test/unit/");
	if (inspect) denoTestArgs.push("--inspect-brk");
	const cmd = [...denoTestArgs, "--", ...applicationCmdArgs];
	testCommands.push({cmd});
}

// E2E tests command
if (needsE2eTests) {
	const denoTestArgs = ["deno", "test", "--no-check", "--allow-env", "--allow-read", "--allow-write", "--allow-run", "--allow-net"];
	/** @type {Set<string>} */
	const applicationCmdArgs = new Set();
	if (browser) {
		applicationCmdArgs.add(`--puppeteer-ws-endpoint=${browser.wsEndpoint()}`);
	}
	const addr = testServerAddrs[0];
	applicationCmdArgs.add(`--test-server-addr=${addr}`);
	denoTestArgs.push(filteredTests || "test/e2e/");
	if (inspect) denoTestArgs.push("--inspect-brk");
	const cmd = [...denoTestArgs, "--", ...applicationCmdArgs, ...Deno.args];
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
	const includeRegex = `^file://${Deno.cwd()}/(src|studio/src|studio/devSocket/src)`;
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
