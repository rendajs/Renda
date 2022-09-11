import {ESLint} from "eslint";
import {rule as noDefaultExportsRule} from "../.eslintrules/no-default-exports.js";
import {rule as noModImportsRule} from "../.eslintrules/no-mod-imports.js";
import {rule as noThisInStaticMethodRule} from "../.eslintrules/no-this-in-static-method.js";
import {setCwd} from "chdir-anywhere";

setCwd();
Deno.chdir("..");

const fix = Deno.args.includes("--fix");

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
		// the actual jsdoc plugin once https://github.com/denoland/deno/issues/15691
		// is fixed.
		jsdoc: {
			rules: {
				"no-undefined-types": dummyRule,
				"require-description-complete-sentence": dummyRule,
			},
		},
	},
	fix,
});

const results = await eslint.lintFiles(["**/*.js"]);

if (fix) {
	await ESLint.outputFixes(results);
}

const formatter = await eslint.loadFormatter("stylish");
const resultText = await formatter.format(results);
console.log(resultText);

for (const result of results) {
	if (result.messages.length > 0) {
		Deno.exit(1);
	}
}
