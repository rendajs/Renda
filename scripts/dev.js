#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-net --no-check=remote --unstable --import-map=importmap.json

import {dirname, join} from "path";
import {setCwd} from "chdir-anywhere";
setCwd();

Deno.chdir("..");

const HASH_STORAGE_PATH = ".lastDevInitHash";
const DOWNLOAD_TYPE_URLS = [
	"https://esm.sh/rollup@2.61.1?pin=v64",
	"https://esm.sh/rollup-plugin-jscc@2.0.0",
	"https://unpkg.com/rollup-plugin-cleanup@3.2.1/index.d.ts",
	"https://deno.land/std@0.118.0/hash/mod.ts",
	"https://deno.land/std@0.121.0/path/mod.ts",
	"https://deno.land/x/chdir_anywhere@v0.0.2/mod.js",
	"https://deno.land/std@0.118.0/testing/asserts.ts",
	"https://deno.land/x/fake-imports@v0.0.6/mod.js",
	"https://deno.land/x/puppeteer@9.0.2/mod.ts",
	"https://raw.githubusercontent.com/jespertheend/fake-imports/main/mod.js",
];

/**
 * @param {Uint8Array} data
 */
async function hash(data) {
	const hash = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hash));
	const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
	return hashHex;
}

const thisScriptContent = await Deno.readFile("./scripts/dev.js");
const textEncoder = new TextEncoder();
const denoVersionBuffer = textEncoder.encode(Deno.version.deno);
const hashBuffer = new Uint8Array(thisScriptContent.byteLength + denoVersionBuffer.byteLength);
hashBuffer.set(thisScriptContent, 0);
hashBuffer.set(denoVersionBuffer, thisScriptContent.byteLength);

const currentHash = await hash(hashBuffer);

let previousHash = null;
try {
	previousHash = await Deno.readTextFile(HASH_STORAGE_PATH);
} catch {
	// Asume this script has never been run before
}

if (currentHash != previousHash || Deno.args.includes("--force-fts")) {
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
	await Deno.mkdir(".denoTypes/@types/deno-types/", {recursive: true});
	await Deno.writeTextFile(".denoTypes/@types/deno-types/index.d.ts", newTypesContent);

	// The following downloads third party dependencies using either one of the following methods:
	// - A single .d.ts file.
	//   If the url ends with .d.ts, only the main entry point will be downloaded
	// - from the x-typescript-types header.
	//   If the main entry point fetch request contains this header, its types will be downloaded
	//   as well. This works on sites like esm.sh. The types of the main entry point are expected
	//   to contain all types of the package, so additional requests of sub-imports are not downloaded.
	// - Using `Deno.emit`
	//   Finally, as a last resort, `Deno.emit` is used to download the types of the package.
	//   This works on sites like deno.land and unpkg.com. The files of the packages are expected
	//   to be either .ts, or .js with .d.ts included. Though I suppose JSDoc types might also work.
	//   `Deno.emit` only emits .d.ts files from .ts files, so if a file is .d.ts, we manually check
	//   for triple slash directives and download the files accordingly.
	/**
	 * @param {string} url
	 * @param {string} dtsContent
	 */
	async function writeTypesFile(url, dtsContent) {
		let filePath = url;
		filePath = filePath.replaceAll(":", "_");
		const fullPath = join(".denoTypes/urlImports", filePath);
		const dir = dirname(fullPath);
		await Deno.mkdir(dir, {recursive: true});
		await Deno.writeTextFile(fullPath, dtsContent);
	}

	console.log("Downloading types from url imports...");
	/** @type {Promise<void>[]} */
	const typeFetchPromises = [];
	const tripleSlashReferences = new Set();
	const referenceTypesRegex = /\/\/\/\s*<\s*reference\s*types\s*=\s*['"](?<url>.*)['"]\s*\/\s*>$/gm;
	for (const url of DOWNLOAD_TYPE_URLS) {
		const promise = (async () => {
			console.log(`Fetching types for "${url}"`);
			const tsResponse = await fetch(url);
			if (tsResponse.ok) {
				if (url.endsWith(".d.ts")) {
					await writeTypesFile(url, await tsResponse.text());
				} else {
					const typesUrl = tsResponse.headers.get("x-typescript-types");
					if (typesUrl) {
						const dtsResponse = await fetch(typesUrl);
						await writeTypesFile(typesUrl, await dtsResponse.text());
					} else {
						const emitResult = await Deno.emit(url, {
							compilerOptions: {
								declaration: true,
								removeComments: false,
							},
						});
						for (const [fileUrl, fileContent] of Object.entries(emitResult.files)) {
							for (const match of fileContent.matchAll(referenceTypesRegex)) {
								const relativeUrl = match.groups?.url;
								if (relativeUrl) {
									const absoluteUrl = new URL(relativeUrl, fileUrl);
									tripleSlashReferences.add(absoluteUrl.href);
								}
							}
							let newFileContent;
							if (fileUrl.endsWith(".js")) {
								newFileContent = "// @ts-nocheck\n" + fileContent;
							} else {
								newFileContent = fileContent;
							}
							await writeTypesFile(fileUrl, newFileContent);
						}
					}
				}
			}
		})();
		typeFetchPromises.push(promise);
	}

	await Promise.all(typeFetchPromises);

	const tripleSlashReferencePromises = [];
	console.log("Fetching .d.ts files from triple slash references in Deno.emit results...");
	for (const url of tripleSlashReferences) {
		const promise = (async () => {
			const tsResponse = await fetch(url);
			if (tsResponse.ok) {
				await writeTypesFile(url, await tsResponse.text());
			}
		})();
		tripleSlashReferencePromises.push(promise);
	}
	await Promise.all(tripleSlashReferencePromises);

	// Run first time setup for the editor
	console.log("Running first time setup for editor...");
	const setupProcess = Deno.run({
		cmd: ["./editor/scripts/buildDependencies.js"],
	});
	await setupProcess.status();

	console.log("First time set up done.");
}

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
