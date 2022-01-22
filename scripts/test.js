#!/usr/bin/env -S deno run --no-check --allow-run --allow-read --allow-write --allow-env

import {setCwd} from "https://deno.land/x/chdir_anywhere@v0.0.2/mod.js";
setCwd();

Deno.chdir("..");

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

const testCommand = ["deno", "test", "--no-check", "--allow-read", "--unstable", ...extraArgs];
if (needsCoverage) {
	try {
		await Deno.remove(".coverage/denoCoverage", {recursive: true});
	} catch (e) {
		if (!(e instanceof Deno.errors.NotFound)) {
			throw e;
		}
	}
	testCommand.push("--coverage=.coverage/denoCoverage");
}
const testProcess = Deno.run({
	cmd: testCommand,
});
const testStatus = await testProcess.status();
if (!testStatus.success) {
	Deno.exit(testStatus.code);
}

if (needsCoverage) {
	console.log("Generating lcov.info...");
	const coverageProcess = Deno.run({
		cmd: ["deno", "coverage", ".coverage/denoCoverage", "--lcov", "--exclude=test/unit"],
		stdout: "piped",
	});
	const lcov = await coverageProcess.output();
	const coverageStatus = await coverageProcess.status();
	if (!coverageStatus.success) {
		Deno.exit(coverageStatus.code);
	}
	await Deno.writeFile(".coverage/lcov.info", lcov);

	if (needsHtmlCoverageReport) {
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
