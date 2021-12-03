#!/usr/bin/env deno

import {createRequire} from "https://deno.land/std@0.110.0/node/module.ts";

const require = createRequire(import.meta.url);
const {rollup} = require("rollup");
const jscc = require("rollup-plugin-jscc");
const cleanup = require("rollup-plugin-cleanup");

(async () => {
	const bundle = await rollup({
		input: "src/index.js",
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
	await bundle.write({
		dir: "build/",
		format: "esm",
	});
})();
