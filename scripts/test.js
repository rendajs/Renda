#!/usr/bin/env -S deno run --no-check --allow-run --allow-read --allow-write --allow-env --import-map=importmap.json

import {join} from "path";
import {setCwd} from "chdir-anywhere";
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
const APPLICATION_ARGS = ["--no-headless"];

const extraDenoTestArgs = Deno.args.filter(arg => !SCRIPT_ARGS.includes(arg) && !APPLICATION_ARGS.includes(arg));
if (extraDenoTestArgs.length <= 0) {
	extraDenoTestArgs.push("test/");
}

let needsCoverage = Deno.args.includes("--coverage");
const needsHtmlCoverageReport = Deno.args.includes("--html");
if (needsHtmlCoverageReport) {
	needsCoverage = true;
}

const denoTestArgs = ["deno", "test", "--no-check", "--allow-env", "--allow-read", "--allow-write", "--allow-run", "--allow-net", "--unstable", "--import-map=importmap.json"];
const applicationArgs = new Set();
for (const arg of Deno.args) {
	if (APPLICATION_ARGS.includes(arg)) {
		applicationArgs.add(arg);
	}
}
if (Deno.args.includes("--inspect") || Deno.args.includes("--inspect-brk")) {
	applicationArgs.add("--no-headless");
}
if (needsCoverage) {
	await removeMaybeDirectory(DENO_COVERAGE_DIR);
	await removeMaybeDirectory(FAKE_IMPORTS_COVERAGE_DIR);
	denoTestArgs.push(`--coverage=${DENO_COVERAGE_DIR}`);
	const coverageMapPath = join(Deno.cwd(), FAKE_IMPORTS_COVERAGE_DIR);
	applicationArgs.add(`--fi-coverage-map=${coverageMapPath}`);
}
denoTestArgs.push(...extraDenoTestArgs);
const cmd = [...denoTestArgs, "--", ...applicationArgs];

console.log(`Running: ${cmd.join(" ")}`);
const testProcess = Deno.run({cmd});
const testStatus = await testProcess.status();
if (!testStatus.success) {
	Deno.exit(testStatus.code);
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
			cmd: ["deno", "run", "--allow-read", "--no-check", "--allow-write", "https://deno.land/x/fake_imports@v0.1.1/applyCoverageMap.js", FAKE_IMPORTS_COVERAGE_DIR, DENO_COVERAGE_DIR],
		});
		await p.status();
	}

	console.log("Generating lcov.info...");
	const includeRegex = `^file://${Deno.cwd()}/(src|editor/src)`;
	const coverageProcess = Deno.run({
		cmd: ["deno", "coverage", DENO_COVERAGE_DIR, "--lcov", `--include=${includeRegex}`],
		stdout: "piped",
	});
	const lcov = await coverageProcess.output();
	const coverageStatus = await coverageProcess.status();
	if (!coverageStatus.success) {
		Deno.exit(coverageStatus.code);
	}
	await Deno.writeFile(".coverage/lcov.info", lcov);

	if (needsHtmlCoverageReport) {
		console.log("Generating HTML coverage report...");
		let genHtmlProcess = null;
		try {
			genHtmlProcess = Deno.run({
				cmd: ["genhtml", "-o", ".coverage/html", ".coverage/lcov.info"],
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
