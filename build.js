#!/usr/bin/env node

const rollup = require("rollup");

(async _ => {
	const bundle = await rollup.rollup({
		input: "src/index.js",
	});
	await bundle.write({
		file: "build/game-engine.js",
		format: "esm",
	});
})();
