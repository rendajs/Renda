#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-net

import {createHash} from "https://deno.land/std@0.118.0/hash/mod.ts";
import {setCwd} from "https://deno.land/x/chdir_anywhere@v0.0.2/mod.js";
setCwd();

const HASH_STORAGE_PATH = "./lastDevInitHash.txt";
const DOWNLOAD_TYPE_URLS = [
	"https://esm.sh/rollup@2.61.1",
	"https://unpkg.com/rollup-plugin-cleanup@3.2.1/index.d.ts",
	"https://esm.sh/rollup-plugin-jscc@2.0.0",
];

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

	/**
	 * @param {string} url
	 * @param {string} dtsContent
	 */
	async function createDts(url, dtsContent) {
		const urlObj = new URL(url);
		let fileName = urlObj.pathname;
		if (fileName.startsWith("/")) {
			fileName = fileName.substring(1);
		}
		fileName = fileName.replaceAll("/", "_");
		if (!fileName.endsWith(".d.ts")) {
			fileName += ".d.ts";
		}
		await Deno.writeTextFile(`../.denoTypes/urlImports/${fileName}`, dtsContent);
		console.log(`Created ${fileName}`);
	}

	await Deno.mkdir("../.denoTypes/urlImports/", {recursive: true});
	/** @type {Promise<void>[]} */
	const typeFetchPromises = [];
	for (const url of DOWNLOAD_TYPE_URLS) {
		const promise = (async () => {
			console.log(`Fetching types for "${url}"`);
			const tsResponse = await fetch(url);
			if (tsResponse.ok) {
				if (url.endsWith(".d.ts")) {
					await createDts(url, await tsResponse.text());
				} else {
					const typesUrl = tsResponse.headers.get("x-typescript-types");
					if (typesUrl) {
						const dtsResponse = await fetch(typesUrl);
						await createDts(url, await dtsResponse.text());
					}
				}
			}
		})();
		typeFetchPromises.push(promise);
	}

	await Promise.all(typeFetchPromises);

	console.log("First time set up done.");
}

Deno.exit();

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
