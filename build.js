#!/usr/bin/env node

import {rollup} from "rollup";

(async _ => {
	const bundle = await rollup({
		input: "src/index.js",
	});
	await bundle.write({
		file: "build/game-engine.js",
		format: "esm",
	});
})();
