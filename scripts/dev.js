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
import {generateTypes} from "https://deno.land/x/deno_tsc_helper@v0.0.4/mod.js";

await generateTypes({
	outputDir: "../.denoTypes",
	importMap: "../importmap.json",
	extraTypeRoots: {
		// We prefix webgpu with aa to ensure it is placed above deno-types.
		// The Deno types include webgpu types but they are outdated.
		"aa-webgpu": "https://unpkg.com/@webgpu/types@0.1.21/dist/index.d.ts",
		"wicg-file-system-access": "https://unpkg.com/@types/wicg-file-system-access@2020.9.5/index.d.ts",
	},
});

setCwd();
Deno.chdir("..");

const buildProcess = Deno.run({
	cmd: ["deno", "task", "build-editor-dev"],
});
await buildProcess.status();

const server = new DevServer({
	port: 8080,
	serverName: "development server",
});
server.start();
