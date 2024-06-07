#!/usr/bin/env -S deno run --unstable --allow-env --allow-run --allow-read --allow-write --allow-net

/**
 * @fileoverview
 * Downloads files necessary for development and then starts the development server.
 * If your platform supports the /usr/bin/env shebang (generally speaking mac and linux),
 * you can simply run this script with `./scripts/dev.js`.
 * On windows you can run this using `deno task dev`.
 */

import { setCwd } from "chdir-anywhere";

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
		const { generateTypes } = await import("https://deno.land/x/deno_tsc_helper@v0.5.0/mod.js");

		const cwd = Deno.cwd();

		const promise = (async () => {
			await generateTypes({
				outputDir: ".denoTypes",
				importMap: "importmap.json",
				include: [
					"scripts",
					"test/shared/",
					"test/unit/",
					"test/e2e/shared/",
					"test/e2e/studio/shared/",
					"test/e2e/studio/src/",
					"studio/devSocket",
				],
				excludeUrls: [
					"rollup-plugin-cleanup",
					"https://deno.land/x/dev@v0.2.0/mod.js", // Temporary workaround for https://github.com/denoland/deno/issues/17210
					"npm:rollup-plugin-resolve-url-objects@0.0.4",
					"npm:eslint-plugin-jsdoc@39.8.0",
					"npm:jszip@3.5.0",

					// The StudioDiscovery references some types from the main Renda repository,
					// but some of these files have css import assertions, causing deno vendor to fail
					"https://raw.githubusercontent.com/rendajs/Renda/3570dc24d41ef1522a97371ebdc2e7b88d15317d/src/util/util.js",
					"https://raw.githubusercontent.com/rendajs/Renda/3570dc24d41ef1522a97371ebdc2e7b88d15317d/src/util/TypedMessenger/TypedMessenger.js",
					"https://raw.githubusercontent.com/rendajs/Renda/3570dc24d41ef1522a97371ebdc2e7b88d15317d/src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js",
					"https://raw.githubusercontent.com/rendajs/Renda/3570dc24d41ef1522a97371ebdc2e7b88d15317d/src/network/studioConnections/DiscoveryManager.js",
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

			// Some of Deno's webgpu types clash with ours
			const pathMod = await import("std/path/mod.ts");
			const denoTypesPath = pathMod.resolve(cwd, ".denoTypes/@types/deno-types/index.d.ts");
			const denoTypes = await Deno.readTextFile(denoTypesPath);
			const canvasConfigurationStart = denoTypes.indexOf("declare interface GPUCanvasConfiguration");
			if (canvasConfigurationStart > 0) {
				const canvasConfigurationEnd = denoTypes.indexOf("}", canvasConfigurationStart) + 1;
				const newDenoTypes = denoTypes.slice(0, canvasConfigurationStart) + denoTypes.slice(canvasConfigurationEnd);
				await Deno.writeTextFile(denoTypesPath, newDenoTypes);
			}
		})();

		// eslint-disable-next-line no-constant-condition
		if (false) {
			// This import exists just to make deno_tsc_helper add this path to the generated tsconfig.js
			await import("https://raw.githubusercontent.com/rendajs/studio-discovery-server/f11212158ce959f55713888eb7fb03679c186ef5/src/WebSocketConnection.js");
		}
		if (needsTypesSync) {
			await promise;
		}
	}

	if (needsDependencies || needsDevDependencies) {
		const { downloadNpmPackage, esmify, addTsNocheck } = await import("https://deno.land/x/dev@v0.4.0/mod.js");

		if (needsDevDependencies) {
			await downloadNpmPackage({
				package: "typescript@5.4.5",
			});
		}

		await downloadNpmPackage({
			package: "@rollup/browser@4.18.0",
		});
		await addTsNocheck({
			path: "npm_packages/@rollup/browser/4.18.0"
		})
		await downloadNpmPackage({
			package: "rollup-plugin-resolve-url-objects@0.0.4",
			downloadDependencies: true,
		});
		await esmify({
			entryPointPath: "npm_packages/rollup-plugin-resolve-url-objects/0.0.4/main.js",
			outFile: "studio/deps/rollup-plugin-resolve-url-objects.js",
		});
	}

	if (serve) {
		const { DevServer } = await import("./DevServer.js");
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
