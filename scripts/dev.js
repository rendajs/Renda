#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-net --no-check=remote --unstable

import {createHash} from "https://deno.land/std@0.118.0/hash/mod.ts";
import {dirname, join} from "https://deno.land/std@0.121.0/path/mod.ts";
import {setCwd} from "https://deno.land/x/chdir_anywhere@v0.0.2/mod.js";
setCwd();

const HASH_STORAGE_PATH = "./lastDevInitHash.txt";
const DOWNLOAD_TYPE_URLS = [
	"https://esm.sh/rollup@2.61.1",
	"https://unpkg.com/rollup-plugin-cleanup@3.2.1/index.d.ts",
	"https://esm.sh/rollup-plugin-jscc@2.0.0",
	"https://deno.land/std@0.118.0/hash/mod.ts",
	"https://deno.land/std@0.121.0/path/mod.ts",
	"https://deno.land/x/chdir_anywhere@v0.0.2/mod.js",
	"https://deno.land/std@0.118.0/testing/asserts.ts",
	"https://deno.land/x/fake_imports@v0.0.6/mod.js",
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

	// Create types for Deno so that we can use the deno api without errors from tsc.
	console.log("Generating Deno types...");
	const getDenoTypesProcess = Deno.run({
		cmd: ["deno", "types", "--unstable"],
		stdout: "piped",
	});
	const typesBuffer = await getDenoTypesProcess.output();
	const typesContent = new TextDecoder().decode(typesBuffer);
	let lines = typesContent.split("\n");
	lines = lines.filter(line => !line.startsWith("/// <reference"));
	const newTypesContent = lines.join("\n");
	await Deno.mkdir("../.denoTypes/@types/deno-types/", {recursive: true});
	await Deno.writeTextFile("../.denoTypes/@types/deno-types/index.d.ts", newTypesContent);

	// Download types from url imports, so that tsc doesn't complain when importing from urls.
	// This way we can develop without errors when the Deno extension is disabled.
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

	console.log("Downloading types from url imports...");
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
					} else {
						const emitResult = await Deno.emit(url, {
							compilerOptions: {
								declaration: true,
							},
						});
						for (const [fileUrl, fileContent] of Object.entries(emitResult.files)) {
							const path = join("../.denoTypes/urlImports/emitted/", fileUrl);
							const dir = dirname(path);
							await Deno.mkdir(dir, {recursive: true});
							let newFileContent;
							if (fileUrl.endsWith(".js")) {
								newFileContent = "// @ts-nocheck\n" + fileContent;
							} else {
								newFileContent = fileContent;
							}
							await Deno.writeTextFile(path, newFileContent);
						}
					}
				}
			}
		})();
		typeFetchPromises.push(promise);
	}

	await Promise.all(typeFetchPromises);

	// Run first time setup for the editor
	console.log("Running first time setup for editor...");
	const setupProcess = Deno.run({
		cmd: ["../editor/scripts/buildDependencies.js"],
	});
	await setupProcess.status();

	console.log("First time set up done.");
}

Deno.chdir("..");

const buildProcess = Deno.run({
	cmd: ["./editor/scripts/build.js", "--dev"],
});
const serverProcess = Deno.run({
	cmd: ["deno", "run", "--allow-net", "--allow-read", "https://deno.land/std@0.122.0/http/file_server.ts", "-p 8080", "--quiet"],
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
