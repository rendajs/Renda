#!/usr/bin/env -S deno run --unstable --allow-read --allow-write --allow-env --no-check --import-map=importmap.json

import {rollup} from "rollup";
import cleanup from "rollup-plugin-cleanup";
import jscc from "rollup-plugin-jscc";

(async () => {
	console.log("Building engine...");
	const bundle = await rollup({
		input: "src/mod.js",
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
	console.log("Writing to disk...");
	await bundle.write({
		dir: "dist/",
		format: "esm",
	});
	console.log("Done.");
})();
