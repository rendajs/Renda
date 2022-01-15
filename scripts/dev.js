#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write

import {createHash} from "https://deno.land/std@0.118.0/hash/mod.ts";
import {setCwd} from "https://deno.land/x/chdir_anywhere@v0.0.2/mod.js";
setCwd();

const HASH_STORAGE_PATH = "./lastDevInitHash.txt";
const thisScriptContent = await Deno.readFile("./dev.js");
const hash = createHash("md5");
hash.update(Deno.version.deno);
hash.update(thisScriptContent);
const currentHash = hash.toString();

let previousHash = null;
try {
	previousHash = await Deno.readTextFile(HASH_STORAGE_PATH);
} catch {
	// Asume this script has never been run before
}

if (currentHash != previousHash || Deno.args.includes("--force-fti")) {
	console.log("changed");
	await Deno.writeTextFile(HASH_STORAGE_PATH, currentHash);

	console.log("Running first time setup...");

	const getDenoTypesProcess = Deno.run({
		cmd: ["deno", "types"],
		stdout: "piped",
	});

	const typesContent = await getDenoTypesProcess.output();
	await Deno.mkdir("../.denoTypes/@types/deno-types/", {recursive: true});
	await Deno.writeFile("../.denoTypes/@types/deno-types/index.d.ts", typesContent);

	console.log("First time set up done.");
}

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
