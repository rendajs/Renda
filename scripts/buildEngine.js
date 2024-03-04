import * as path from "std/path/mod.ts";
import { rollup } from "rollup";
import cleanup from "rollup-plugin-cleanup";
import jscc from "rollup-plugin-jscc";

async function createBundle() {
	const scriptLocation = path.fromFileUrl(import.meta.url);
	const scriptDir = path.dirname(scriptLocation);
	const inputPath = path.resolve(scriptDir, "../src/mod.js");
	const bundle = await rollup({
		input: inputPath,
		plugins: [
			jscc({
				values: {
					_IS_CLOSURE_BUILD: true,
				},
			}),
			cleanup(),
		],
		onwarn: message => {
			if (message.code == "CIRCULAR_DEPENDENCY") return;
			console.error(message.message);
		},
	});
	return bundle;
}
/** @type {import("rollup").OutputOptions} */
const outputOptions = {
	dir: "dist/",
	format: "esm",
};

if (import.meta.main) {
	console.log("Building engine...");
	const bundle = await createBundle();
	console.log("Writing to disk...");
	await bundle.write(outputOptions);
	console.log("Done.");
}

export async function buildEngine() {
	const bundle = await createBundle();
	const { output } = await bundle.generate(outputOptions);
	if (output.length != 1) {
		throw new Error("Assertion failed, more than one file generated");
	}
	const chunk = output[0];
	if (chunk.type != "chunk") {
		throw new Error("Assertion failed, generated file is not a chunk");
	}
	return chunk.code;
}
