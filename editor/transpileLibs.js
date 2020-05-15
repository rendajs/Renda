#!/usr/bin/env node

const rollup = require("rollup");
const path = require("path");
const commonjs = require("@rollup/plugin-commonjs");

let libs = [
	{
		input: "../node_modules/js-md5/src/md5.js",
		output: "md5.js",
	}
];

(async _ => {
	for(const lib of libs){
		let inputPath = path.resolve(__dirname, lib.input);
		let outputPath = path.resolve(__dirname, "libs", lib.output);
		const bundle = await rollup.rollup({
			input: inputPath,
			plugins: [commonjs()],
		});
		await bundle.write({
			file: "./libs/"+lib.output,
			format: "esm",
		});
	}
})();
