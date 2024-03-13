import * as path from "std/path/mod.ts";
import * as fs from "std/fs/mod.ts";
import { rollup } from "rollup";
import cleanup from "rollup-plugin-cleanup";
import jscc from "rollup-plugin-jscc";
import { overrideDefines } from "./shared/overrideDefinesPlugin.js";
import { minify } from "terser";

const engineDefines = {
	ENGINE_ASSETS_LIVE_UPDATES_SUPPORT: false,
	ENTITY_ASSETS_IN_ENTITY_JSON_EXPORT: false,
	DEFAULT_ASSET_LINKS_IN_ENTITY_JSON_EXPORT: false,
	STUDIO_DEFAULTS_IN_COMPONENTS: false,
};

const scriptLocation = path.fromFileUrl(import.meta.url);
const scriptDir = path.dirname(scriptLocation);

async function createBundle() {
	const inputPath = path.resolve(scriptDir, "../src/mod.js");
	const bundle = await rollup({
		input: inputPath,
		plugins: [
			overrideDefines("/src/engineDefines.js", engineDefines),
			jscc({
				values: {
					_IS_CLOSURE_BUILD: true,
				},
			}),
			cleanup(),
		],
		onwarn: (message) => {
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

export async function buildEngineSource() {
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

/**
 * @param {string} outDir
 */
export async function buildEngine(outDir) {
	console.log("Building engine...");
	const engineSource = await buildEngineSource();
	console.log("Writing to disk...");
	await fs.ensureDir(outDir);
	await Deno.writeTextFile(path.resolve(outDir, "renda.js"), engineSource);
	console.log("Minifying...");
	const minified = await minify(engineSource);
	if (!minified.code) {
		throw new Error("Failed to minify engine source");
	}
	await Deno.writeTextFile(path.resolve(outDir, "renda.min.js"), minified.code);
	console.log("Done.");
}

if (import.meta.main) {
	const outDir = path.resolve(scriptDir, "../dist/");
	await buildEngine(outDir);
}
