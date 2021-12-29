#!/usr/bin/env -S deno run --allow-run --allow-read

import {setCwd} from "https://deno.land/x/chdir_anywhere@v0.0.2/mod.js";
setCwd();

Deno.chdir("..");

const buildProcess = Deno.run({
	cmd: ["./editor/scripts/build.js", "--dev"],
});
const serverProcess = Deno.run({
	cmd: ["deno", "run", "--allow-net", "--allow-read", "https://deno.land/std@0.119.0/http/file_server.ts", "-p 8080"],
});
const devSocketProcess = Deno.run({
	cmd: ["./editor/devSocket/src/main.js"],
});
const editorDiscoveryProcess = Deno.run({
	cmd: ["./editor/editorDiscoveryServer/src/main.js"],
});

await buildProcess.status();
await serverProcess.status();
await devSocketProcess.status();
await editorDiscoveryProcess.status();
