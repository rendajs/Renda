#!/usr/bin/env node

import {rollup} from "rollup";
import path from "path";
import commonjs from "@rollup/plugin-commonjs";
import {fileURLToPath} from "url";

let libs = [
	{
		input: "../node_modules/js-md5/src/md5.js",
		output: "md5.js",
	},
	{
		input: "../node_modules/rollup/dist/rollup.browser.js",
		output: "rollup.browser.js",
	},
	{
		input: "../node_modules/google-closure-compiler-js/jscomp.js",
		output: "jscomp.js",
	},
];

function ignore(ignoreList){
	const emptyModuleId = "ignore_empty_module_placeholder";
	const emptyModule = "export default {}";
	return {
		name: "ignore-extern-fs",
		resolveId: source => {
			if(ignoreList.includes(source)) return emptyModuleId;
			return null;
		},
		load: id => {
			if(id.includes(emptyModuleId)){
				return emptyModule;
			}
			return null;
		},
		transform: (code, id) => {
			if(!id.includes(emptyModuleId)) return;
			return {
				code: emptyModule,
				map: null,
			};
		},
	}
}

(async _ => {
	const __dirname = path.dirname(fileURLToPath(import.meta.url));

	for(const lib of libs){
		let inputPath = path.resolve(__dirname, lib.input);
		let outputPath = path.resolve(__dirname, "libs", lib.output);
		console.log("bundling "+lib.input);
		const bundle = await rollup({
			input: inputPath,
			plugins: [commonjs(), ignore(["fs"])],
		});
		console.log("writing to "+lib.output);
		await bundle.write({
			file: path.resolve(__dirname, "libs", lib.output),
			format: "esm",
		});
	}
})();
