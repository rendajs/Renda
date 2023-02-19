import {ESLint} from "eslint";
import jsdoc from "npm:eslint-plugin-jsdoc@39.8.0";
import {rule as noDefaultExportsRule} from "../.eslintrules/no-default-exports.js";
import {rule as noModImportsRule} from "../.eslintrules/no-mod-imports.js";
import {rule as noThisInStaticMethodRule} from "../.eslintrules/no-this-in-static-method.js";
import {setCwd} from "chdir-anywhere";
import {readAll} from "std/streams/mod.ts";

setCwd();
Deno.chdir("..");

const fixPrefix = "--fix";
const fix = Deno.args.includes(fixPrefix);

const ioPrefix = "--io";
const useIo = Deno.args.includes(ioPrefix);

let fileArg = null;
const fileArgPrefix = "--file=";
for (const arg of Deno.args) {
	if (arg.startsWith(fileArgPrefix)) {
		fileArg = arg.slice(fileArgPrefix.length);
		break;
	}
}

if (useIo) {
	if (!fileArg) throw new Error(`${fileArgPrefix} is required when ${ioPrefix} is used.`);
	if (!fix) throw new Error(`${fixPrefix} is required when ${ioPrefix} is used.`);
}

const eslint = new ESLint({
	plugins: {
		rulesdir: {
			get rules() {
				return {
					"no-default-exports": noDefaultExportsRule,
					"no-mod-imports": noModImportsRule,
					"no-this-in-static-method": noThisInStaticMethodRule,
				};
			},
		},
		jsdoc,
	},
	fix,
});

/**
 * @param {string | undefined} str
 */
async function writeStdout(str) {
	if (!str) return;
	const textEncoder = new TextEncoder();
	const stdout = textEncoder.encode(str);
	await Deno.stdout.write(stdout);
}

if (useIo) {
	const fileBuffer = await readAll(Deno.stdin);
	const textDecoder = new TextDecoder();
	const fileContent = textDecoder.decode(fileBuffer);
	const filePath = /** @type {string} */ (fileArg); // We already checked if it was null earlier.
	const results = await eslint.lintText(fileContent, {
		filePath,
	});
	if (results.length < 1) {
		throw new Error("Failed to apply fixes, no results.");
	} else if (results.length > 1) {
		throw new Error("Failed to apply fixes, more than one result.");
	}
	await writeStdout(results[0].output);
} else {
	let lintFilesStr = "";
	if (Deno.args.includes("--all")) {
		lintFilesStr = "**/*.js";
	} else {
		const proc = Deno.run({
			cmd: ["git", "status", "-z"],
			stdout: "piped",
		});
		const status = await proc.status();
		if (!status.success) {
			throw new Error("Failed to determine which files were changed, run with --all to lint all files in the repository.");
		}
		const result = await proc.output();

		let files = [];
		let i = 0;
		let prevStart = 0;
		let skipNext = false;
		const textDecoder = new TextDecoder();
		while (i < result.byteLength) {
			if (result[i] == 0) {
				const chunk = result.slice(prevStart, i);
				prevStart = i + 1;
				const text = textDecoder.decode(chunk);
				if (skipNext) {
					skipNext = false;
				} else {
					const xy = text.slice(0, 2);
					const path = text.slice(3);
					if (["M", "A", "C", "R", "U", "?"].includes(xy[1])) {
						files.push(path);
					} else if (["M ", "A "].includes(xy)) {
						files.push(path);
					} else if (xy[0] == "R") {
						skipNext = true;
						files.push(path);
					}
				}
			}
			i++;
		}
		files = files.map(f => {
			if (f.endsWith("/")) {
				return f + "**/*.js";
			}
			return f;
		});
		files = files.filter(f => f.endsWith(".js"));
		if (files.length == 0) {
			console.log("No files have been modified, there's nothing to lint. Use --all if you wish to forcefully lint all files.");
			Deno.exit();
		} else if (files.length == 1) {
			lintFilesStr = files[0];
		} else {
			lintFilesStr = "{" + files.join(",") + "}";
		}
	}
	const results = await eslint.lintFiles(lintFilesStr);
	if (fix) {
		await ESLint.outputFixes(results);
	}

	const formatter = await eslint.loadFormatter("stylish");
	const resultText = await formatter.format(results);
	await writeStdout(resultText);

	for (const result of results) {
		if (result.messages.length > 0) {
			Deno.exit(1);
		}
	}
}
