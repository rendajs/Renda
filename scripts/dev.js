#!/usr/bin/env -S deno run --allow-env --allow-run --allow-read --allow-write --allow-net --no-check

/**
 * @fileoverview
 * Downloads files necessary for development and then starts the development server.
 * If your platform supports the /usr/bin/env shebang (generally speaking mac and linux),
 * you can simply run this script with `./scripts/dev.js`.
 * On windows you can run this using `deno task dev`.
 */

import {setCwd} from "chdir-anywhere";
import {DevServer} from "./DevServer.js";
import {generateTypes} from "https://deno.land/x/deno_tsc_helper@v0.2.1/mod.js";
import {dev as devModule} from "https://deno.land/x/dev@v0.2.0/mod.js";

export async function dev({
	needsDevDependencies = false,
	needsTypes = false,
	needsTypesSync = true,
	suppressTypesLogging = false,
	serve = false,
} = {}) {
	setCwd(import.meta.url);
	Deno.chdir("..");

	if (needsTypes) {
		const promise = generateTypes({
			outputDir: ".denoTypes",
			unstable: true,
			importMap: "importmap.json",
			include: [
				"scripts",
				"test",
				"editor/devSocket",
			],
			excludeUrls: [
				"rollup-plugin-cleanup",
				"https://deno.land/x/dev@v0.2.0/mod.js", // Temporary workaround for https://github.com/denoland/deno/issues/17210
				"npm:rollup-plugin-resolve-url-objects@0.0.4",
				"npm:eslint-plugin-jsdoc@39.8.0",
			],
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
				"npm:postcss-url@10.1.3": "https://unpkg.com/@types/postcss-url@10.0.0/index.d.ts",
			},
			logLevel: suppressTypesLogging ? "WARNING" : "DEBUG",
		});
		if (needsTypesSync) {
			await promise;
		}
	}

	await devModule({
		actions: [
			// required for during development, can be skipped with ci
			{
				type: "downloadNpmPackage",
				package: "typescript@4.8.3",
				ignore: !needsDevDependencies,
			},

			// editor dependencies
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

	if (serve) {
		const server = new DevServer({
			port: 8080,
			serverName: "development server",
		});
		server.start();
	}
}

if (import.meta.main) {
	await dev({
		needsTypes: true,
		needsTypesSync: false,
		suppressTypesLogging: true,
		needsDevDependencies: true,
		serve: true,
	});
}
