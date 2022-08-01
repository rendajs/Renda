#!/usr/bin/env -S deno run --unstable --allow-read --allow-write --allow-net --allow-env --no-check

import {createRequire} from "std/node/module.ts";
import {dirname, fromFileUrl, resolve} from "std/path/mod.ts";
import {rollup} from "rollup";

// import resolveUrlObjects from "rollup-plugin-resolve-url-objects";

const compatRequire = createRequire(import.meta.url);
const commonjs = compatRequire("@rollup/plugin-commonjs");
const {nodeResolve} = compatRequire("@rollup/plugin-node-resolve");

/**
 * Small Rollup plugin for replacing the content of certain imports with an empty object.
 * This is to strip a way imports that are only accessible via node such as "fs".
 * @param {string[]} ignoreList
 * @returns {import("rollup").Plugin}
 */
function ignore(ignoreList) {
	const emptyModuleId = "ignore_empty_module_placeholder";
	const emptyModule = "export default {}";
	return {
		name: "ignore-extern-fs",
		resolveId: source => {
			if (ignoreList.includes(source)) return emptyModuleId;
			return null;
		},
		load: id => {
			if (id.includes(emptyModuleId)) {
				return emptyModule;
			}
			return null;
		},
		transform: (code, id) => {
			if (!id.includes(emptyModuleId)) return null;
			return {
				code: emptyModule,
				map: null,
			};
		},
	};
}

/**
 * Small Rollup plugin for removing the # sourceMappingURL comment at the bottom of every file.
 * @returns {import("rollup").Plugin}
 */
function removeSourceMaps() {
	/**
	 * @param {string} code
	 */
	function executeRemoval(code) {
		return code.replace(/^\s*\/\/# sourceMappingURL=.*/gm, "");
	}
	return {
		name: "remove-source-maps",
		renderChunk(code, chunk) {
			return executeRemoval(code);
		},
		transform(code, id) {
			return executeRemoval(code);
		},
	};
}

/**
 * Small plugin for adding a string at the top of every file.
 * @param {string} headerCode
 * @returns {import("rollup").Plugin}
 */
function addHeader(headerCode) {
	return {
		name: "add-header",
		renderChunk(code, chunk) {
			return headerCode + code;
		},
	};
}

const libs = [
	{
		input: "../../node_modules/rollup/dist/rollup.browser.js",
		output: "rollup.browser.js",
		plugins: [removeSourceMaps()],
	},
	{
		input: "../../node_modules/rollup-plugin-resolve-url-objects/main.js",
		output: "rollup-plugin-resolve-url-objects.js",
	},
];

const scriptDir = dirname(fromFileUrl(import.meta.url));

for (const lib of libs) {
	const inputPath = resolve(scriptDir, lib.input);
	console.log("bundling " + lib.input);
	const libPlugins = lib.plugins || [];
	const plugins = [...libPlugins, commonjs(), ignore(["fs"]), addHeader("// @ts-nocheck\n\n"), nodeResolve()];
	const bundle = await rollup({
		input: inputPath,
		plugins,
	});
	console.log("writing to " + lib.output);
	await bundle.write({
		file: resolve(scriptDir, "../libs", lib.output),
		format: "esm",
	});
}
