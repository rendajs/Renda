#!/usr/bin/env -S deno run --unstable --allow-read --allow-write --allow-env --no-check

import {rollup} from "https://esm.sh/rollup@2.61.1?pin=v64";
import cleanup from "https://esm.sh/rollup-plugin-cleanup@3.2.1?pin=v64";
import jscc from "https://esm.sh/rollup-plugin-jscc@2.0.0?pin=v64";

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
