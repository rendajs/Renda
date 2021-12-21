#!/usr/bin/env -S deno run --unstable --allow-read --allow-write

import {rollup} from "https://esm.sh/rollup@2.61.1";
import cleanup from "https://esm.sh/rollup-plugin-cleanup@3.2.1";
import jscc from "https://esm.sh/rollup-plugin-jscc@2.0.0";

(async () => {
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
	await bundle.write({
		dir: "build/",
		format: "esm",
	});
})();
