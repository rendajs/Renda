#!/usr/bin/env node

import {rollup} from "rollup";
import jscc from "rollup-plugin-jscc";
import cleanup from "rollup-plugin-cleanup";

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
		file: "build/game-engine.js",
		format: "esm",
	});
})();
