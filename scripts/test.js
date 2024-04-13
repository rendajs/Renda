#!/usr/bin/env -S deno run --unstable --no-check --allow-run --allow-read --allow-write --allow-env --allow-net

import { join, resolve } from "std/path/mod.ts";
import { setCwd } from "chdir-anywhere";
import { dev } from "./dev.js";
import { parseArgs } from "../test/shared/testArgs.js";

setCwd();
Deno.chdir("..");

const DENO_COVERAGE_DIR = ".coverage/denoCoverage";
const DENO_HTML_COVERAGE_DIR = ".coverage/html";
const FAKE_IMPORTS_COVERAGE_DIR = ".coverage/fakeImportsCoverageMap";

/**
 * @param {string} path
 */
async function removeMaybeDirectory(path) {
	try {
		await Deno.remove(path, { recursive: true });
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
if (Deno.args.length > 0 && !Deno.args[0].startsWith("-")) {
	filteredTests = Deno.args[0];
}

const needsUnitTests = !filteredTests || filteredTests.startsWith("test/unit");
const needsE2eTests = !filteredTests || filteredTests.startsWith("test/e2e");

await dev({
	needsDependencies: needsE2eTests,
});

const { inspect } = parseArgs();

const needsCoverage = Deno.args.includes("--coverage") || Deno.args.includes("-c");

/** @type {string[][]} */
const testCommands = [];

// Unit tests
if (needsUnitTests) {
	const denoTestArgs = [Deno.execPath(), "test", "--no-check", "--allow-env", "--allow-read", "--allow-net", "--parallel"];
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
	const cmd = [Deno.execPath(), "run", "--allow-env", "--allow-read", "--allow-write", "--allow-run", "--allow-net"];
	if (inspect) cmd.push("--inspect-brk");
	cmd.push("test/e2e/shared/e2eTestRunner.js", ...Deno.args);
	testCommands.push(cmd);
}

for (const cmd of testCommands) {
	console.log(`Running: ${cmd.join(" ")}`);
	const [exec, ...args] = cmd;
	const testCommand = new Deno.Command(exec, { args, stdout: "inherit", stderr: "inherit" });
	const testOutput = await testCommand.output();
	if (!testOutput.success) {
		Deno.exit(testOutput.code);
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
		const cmd = new Deno.Command(Deno.execPath(), {
			args: ["run", "--allow-read", "--no-check", "--allow-write", "https://deno.land/x/fake_imports@v0.8.1/applyCoverageMap.js", FAKE_IMPORTS_COVERAGE_DIR, DENO_COVERAGE_DIR],
			stdout: "inherit",
			stderr: "inherit",
		});
		const output = await cmd.output();
		if (!output.success) {
			throw new Error(`Applying fake-imports coverage map failed with status ${output.code}`);
		}
	}

	console.log("Generating cov.lcov...");
	const includeRegex = `^file://${Deno.cwd()}/(src|studio/src|studio/devSocket/src)`;
	const lcovCommand = new Deno.Command(Deno.execPath(), {
		args: ["coverage", DENO_COVERAGE_DIR, "--lcov", `--include=${includeRegex}`],
		stdout: "piped",
		stderr: "piped",
	});
	const lcovOutput = await lcovCommand.output();
	if (!lcovOutput.success) {
		Deno.exit(lcovOutput.code);
	}
	await Deno.writeFile(".coverage/cov.lcov", lcovOutput.stdout);

	console.log("Generating HTML coverage report...");
	const htmlCoverageCommand = new Deno.Command(Deno.execPath(), {
		args: ["coverage", DENO_COVERAGE_DIR, "--html", `--include=${includeRegex}`],
		stdout: "piped",
		stderr: "piped",
	});
	const htmlOutput = await htmlCoverageCommand.output();
	if (!htmlOutput.success) {
		Deno.exit(htmlOutput.code);
	}

	try {
		await Deno.remove(DENO_HTML_COVERAGE_DIR, { recursive: true });
	} catch (e) {
		if (e instanceof Deno.errors.NotFound) {
			// Already removed
		} else {
			throw e;
		}
	}
	await Deno.rename(resolve(DENO_COVERAGE_DIR, "html"), DENO_HTML_COVERAGE_DIR);
}
