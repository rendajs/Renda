#!/usr/bin/env -S deno run --unstable --no-check --allow-run --allow-read --allow-write --allow-env --allow-net

import {join} from "std/path/mod.ts";
import {setCwd} from "chdir-anywhere";
import {dev} from "./dev.js";
import {parseArgs} from "../test/shared/testArgs.js";

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

const {inspect} = parseArgs();

let needsCoverage = Deno.args.includes("--coverage") || Deno.args.includes("-c");
const needsHtmlCoverageReport = Deno.args.includes("--html");
if (needsHtmlCoverageReport) {
	needsCoverage = true;
}

/** @type {string[][]} */
const testCommands = [];

// Unit tests
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
	testCommands.push(cmd);
}

// E2e tests
if (needsE2eTests) {
	const cmd = ["deno", "run", "--allow-env", "--allow-read", "--allow-write", "--allow-run", "--allow-net"];
	if (inspect) cmd.push("--inspect-brk");
	cmd.push("test/e2e/shared/e2eTestRunner.js", ...Deno.args);
	testCommands.push(cmd);
}

let lastTestStatus;
for (const cmd of testCommands) {
	console.log(`Running: ${cmd.join(" ")}`);
	const testProcess = Deno.run({cmd});
	lastTestStatus = await testProcess.status();
	if (!lastTestStatus.success) {
		Deno.exit(lastTestStatus.code);
	}
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
			cmd: ["deno", "run", "--allow-read", "--no-check", "--allow-write", "https://deno.land/x/fake_imports@v0.8.1/applyCoverageMap.js", FAKE_IMPORTS_COVERAGE_DIR, DENO_COVERAGE_DIR],
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
