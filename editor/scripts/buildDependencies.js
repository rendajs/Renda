#!/usr/bin/env -S deno run --unstable --allow-read --allow-write --allow-env --import-map=importmap.json

import {createRequire} from "https://deno.land/std@0.110.0/node/module.ts";
import {dirname, fromFileUrl, resolve} from "path";

import {rollup} from "rollup";

// import resolveUrlObjects from "rollup-plugin-resolve-url-objects";

const require = createRequire(import.meta.url);
const commonjs = require("@rollup/plugin-commonjs");
const {nodeResolve} = require("@rollup/plugin-node-resolve");

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

function removeSourceMaps() {
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
		input: "../../node_modules/js-md5/src/md5.js",
		output: "md5.js",
	},
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
