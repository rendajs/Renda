import {ESLint} from "eslint";
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

/** @type {import("eslint").Rule.RuleModule} */
const dummyRule = {
	create(ctx) {
		return {};
	},
};

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
		// For now this plugin only stubs some rules that are disabled/enabled
		// in code using eslint-enable comments. But we'll replace this with
		// the actual jsdoc plugin once "npm:eslint-plugin-jsdoc@39.3.6" is
		// importable in Deno
		jsdoc: {
			rules: {
				"no-undefined-types": dummyRule,
				"require-description-complete-sentence": dummyRule,
			},
		},
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
	const results = await eslint.lintFiles("**/*.js");
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
