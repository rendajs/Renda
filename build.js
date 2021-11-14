#!/usr/bin/env node

import {rollup} from "rollup";
import jscc from "rollup-plugin-jscc";
import cleanup from "rollup-plugin-cleanup";
import resolveUrlObjects from "rollup-plugin-resolve-url-objects";

(async () => {
	const bundle = await rollup({
		input: "src/index.js",
		plugins: [
			resolveUrlObjects(),
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
