#!/usr/bin/env -S deno run --allow-env --allow-run --allow-read --allow-write --allow-net --no-check --unstable

/**
 * @fileoverview
 * Downloads files necessary for development and then starts the development server.
 * If your platform supports the /usr/bin/env shebang (generally speaking mac and linux),
 * you can simply run this script with `./scripts/dev.js`.
 * On windows you can run this using `deno task dev`.
 */

import {setCwd} from "chdir-anywhere";
import {DevServer} from "./DevServer.js";
import {generateTypes} from "/Users/Jesper/repositories/deno-tsc-helper/mod.js";
import {dev} from "https://raw.githubusercontent.com/jespertheend/dev/a7374e35d6a06d5835682bf8478156046def9697/mod.js";

setCwd();
Deno.chdir("..");

await generateTypes({
	outputDir: ".denoTypes",
	importMap: "importmap.json",
	preCollectedImportsFile: "precollectedImports.json",
	include: [
		"scripts",
		"test",
		"editor/devSocket",
		"editor/scripts",
	],
	excludeUrls: ["rollup-plugin-commonjs"],
	extraTypeRoots: {
		// We prefix webgpu with aa to ensure it is placed above deno-types.
		// The Deno types include webgpu types but they are outdated.
		"aa-webgpu": "https://unpkg.com/@webgpu/types@0.1.21/dist/index.d.ts",
		"wicg-file-system-access": "https://unpkg.com/@types/wicg-file-system-access@2020.9.5/index.d.ts",
		"strict-map": "https://deno.land/x/strictly@v0.0.1/src/map.d.ts",
		"strict-set": "https://deno.land/x/strictly@v0.0.1/src/set.d.ts",
	},
	exactTypeModules: {
		eslint: "https://unpkg.com/@types/eslint@8.4.6/index.d.ts",
		estree: "https://unpkg.com/@types/estree@1.0.0/index.d.ts",
	},
});

await dev({
	actions: [
		{
			type: "downloadNpmPackage",
			package: "rollup@2.60.0",
		},
		{
			type: "downloadNpmPackage",
			package: "rollup-plugin-resolve-url-objects@0.0.4",
			downloadDependencies: true,
		},
		{
			type: "esmify",
			entryPointPath: "npm_packages/rollup/2.60.0/dist/rollup.browser.js",
			outputPath: "editor/deps/rollup.browser.js",
		},
		{
			type: "esmify",
			entryPointPath: "npm_packages/rollup-plugin-resolve-url-objects/0.0.4/main.js",
			outputPath: "editor/deps/rollup-plugin-resolve-url-objects.js",
		},
	],
});

if (!Deno.args.includes("--no-serve")) {
	const server = new DevServer({
		port: 8080,
		serverName: "development server",
	});
	server.start();
}
