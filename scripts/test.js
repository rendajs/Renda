#!/usr/bin/env -S deno run --no-check --allow-run --allow-read --allow-write --allow-env

import {join} from "https://deno.land/std@0.119.0/path/mod.ts";
import {setCwd} from "https://deno.land/x/chdir_anywhere@v0.0.2/mod.js";
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

const filteredArgs = ["--coverage", "--html"];

const extraArgs = Deno.args.filter(arg => !filteredArgs.includes(arg));
if (extraArgs.length <= 0) {
	extraArgs.push("test/unit");
}

let needsCoverage = Deno.args.includes("--coverage");
const needsHtmlCoverageReport = Deno.args.includes("--html");
if (needsHtmlCoverageReport) {
	needsCoverage = true;
}

const denoTestArgs = ["deno", "test", "--no-check", "--allow-read", "--unstable"];
const applicationArgs = [];
if (needsCoverage) {
	await removeMaybeDirectory(DENO_COVERAGE_DIR);
	await removeMaybeDirectory(FAKE_IMPORTS_COVERAGE_DIR);
	denoTestArgs.push("--allow-write");
	denoTestArgs.push(`--coverage=${DENO_COVERAGE_DIR}`);
	const coverageMapPath = join(Deno.cwd(), FAKE_IMPORTS_COVERAGE_DIR);
	applicationArgs.push(`--fi-coverage-map=${coverageMapPath}`);
}
denoTestArgs.push(...extraArgs);
const cmd = [...denoTestArgs, "--", ...applicationArgs];

console.log(`Running: ${cmd.join(" ")}`);
const testProcess = Deno.run({cmd});
const testStatus = await testProcess.status();
if (!testStatus.success) {
	Deno.exit(testStatus.code);
}

if (needsCoverage) {
	console.log("Applying fake-imports coverage map.");
	const p = Deno.run({
		cmd: ["deno", "run", "--allow-read", "--no-check", "--allow-write", "https://raw.githubusercontent.com/jespertheend/fake-imports/main/applyCoverage.js", FAKE_IMPORTS_COVERAGE_DIR, DENO_COVERAGE_DIR],
	});
	await p.status();

	console.log("Generating lcov.info...");
	const coverageProcess = Deno.run({
		cmd: ["deno", "coverage", DENO_COVERAGE_DIR, "--lcov",  "--exclude=test/unit"],
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
