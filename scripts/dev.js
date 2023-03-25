#!/usr/bin/env -S deno run --unstable --allow-env --allow-run --allow-read --allow-write --allow-net

/**
 * @fileoverview
 * Downloads files necessary for development and then starts the development server.
 * If your platform supports the /usr/bin/env shebang (generally speaking mac and linux),
 * you can simply run this script with `./scripts/dev.js`.
 * On windows you can run this using `deno task dev`.
 */

import {setCwd} from "chdir-anywhere";

/**
 * @param {object} opts
 * @param {boolean} [opts.needsDependencies] Download dependencies required for running studio locally.
 * @param {boolean} [opts.needsDevDependencies] Download dependencies for working on the project,
 * for now this is only TypeScript. This allows vscode the specific TypeScript version included in the project.
 * @param {boolean} [opts.needsTypes] Downloads types required for type checking the project.
 * @param {boolean} [opts.needsTypesSync] Normally the promise of this function doesn't resolve until all types
 * have been downloaded. You can set this to false to download the types in the background, while still being able to
 * wait for other tasks to finish.
 * @param {boolean} [opts.suppressTypesLogging] Don't log downloaded type messages to the console.
 * @param {boolean} [opts.serve] Start a local webserver.
 */
export async function dev({
	needsDependencies = false,
	needsDevDependencies = false,
	needsTypes = false,
	needsTypesSync = true,
	suppressTypesLogging = false,
	serve = false,
} = {}) {
	setCwd(import.meta.url);
	Deno.chdir("..");

	if (needsTypes) {
		const {generateTypes} = await import("https://deno.land/x/deno_tsc_helper@v0.4.0/mod.js");

		const promise = generateTypes({
			outputDir: ".denoTypes",
			unstable: true,
			importMap: "importmap.json",
			include: [
				"scripts",
				"test",
				"studio/devSocket",
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
				"aa-webgpu": "https://cdn.jsdelivr.net/npm/@webgpu/types@0.1.21/dist/index.d.ts",
				"wicg-file-system-access": "https://cdn.jsdelivr.net/npm/@types/wicg-file-system-access@2020.9.5/index.d.ts",
				"strict-map": "https://deno.land/x/strictly@v0.0.1/src/map.d.ts",
				"strict-set": "https://deno.land/x/strictly@v0.0.1/src/set.d.ts",
			},
			exactTypeModules: {
				eslint: "https://cdn.jsdelivr.net/npm/@types/eslint@8.4.6/index.d.ts",
				estree: "https://cdn.jsdelivr.net/npm/@types/estree@1.0.0/index.d.ts",
				"npm:postcss-url@10.1.3": "https://cdn.jsdelivr.net/npm/@types/postcss-url@10.0.0/index.d.ts",
			},
			logLevel: suppressTypesLogging ? "WARNING" : "DEBUG",
		});
		if (needsTypesSync) {
			await promise;
		}
	}

	if (needsDependencies || needsDevDependencies) {
		const {dev} = await import("https://deno.land/x/dev@v0.2.0/mod.js");

		await dev({
			actions: [
				// required for during development, can be skipped with ci
				{
					type: "downloadNpmPackage",
					package: "typescript@5.0.2",
					ignore: !needsDevDependencies,
				},

				// studio dependencies
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
					outputPath: "studio/deps/rollup.browser.js",
				},
				{
					type: "esmify",
					entryPointPath: "npm_packages/rollup-plugin-resolve-url-objects/0.0.4/main.js",
					outputPath: "studio/deps/rollup-plugin-resolve-url-objects.js",
				},
			],
		});
	}

	if (serve) {
		const {DevServer} = await import("./DevServer.js");
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
		needsDependencies: true,
		serve: true,
	});
}
