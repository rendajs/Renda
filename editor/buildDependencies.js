#!/usr/bin/env node

import {rollup} from "rollup";
import path from "path";
import commonjs from "@rollup/plugin-commonjs";
import {fileURLToPath} from "url";

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
		input: "../node_modules/js-md5/src/md5.js",
		output: "md5.js",
	},
	{
		input: "../node_modules/rollup/dist/rollup.browser.js",
		output: "rollup.browser.js",
		plugins: [removeSourceMaps()],
	},
];

(async () => {
	const dirname = path.dirname(fileURLToPath(import.meta.url));

	for (const lib of libs) {
		const inputPath = path.resolve(dirname, lib.input);
		console.log("bundling " + lib.input);
		const libPlugins = lib.plugins || [];
		const plugins = [...libPlugins, commonjs(), ignore(["fs"]), addHeader("// @ts-nocheck\n\n")];
		const bundle = await rollup({
			input: inputPath,
			plugins,
		});
		console.log("writing to " + lib.output);
		await bundle.write({
			file: path.resolve(dirname, "libs", lib.output),
			format: "esm",
		});
	}
})();
