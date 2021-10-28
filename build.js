#!/usr/bin/env node

import {rollup} from "rollup";
import jscc from "rollup-plugin-jscc";

(async () => {
	const bundle = await rollup({
		input: "src/index.js",
		plugins: [
			jscc({
				values: {
					_IS_CLOSURE_BUILD: true,
				},
			}),
		],
	});
	await bundle.write({
		file: "build/game-engine.js",
		format: "esm",
	});
})();
