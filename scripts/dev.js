#!/usr/bin/env -S deno run --allow-env --allow-run --allow-read --allow-write --allow-net --no-check --unstable

import {dirname, join, resolve} from "std/path";
import {setCwd} from "chdir-anywhere";
import {serveDir} from "https://deno.land/std@0.127.0/http/file_server.ts";
import {serve} from "https://deno.land/std@0.127.0/http/server.ts";
import {Application as DevSocket} from "../editor/devSocket/src/Application.js";
import {hashBuffer} from "../src/util/bufferUtil.js";

setCwd();
Deno.chdir("..");

const HASH_STORAGE_PATH = ".lastDevInitHash";
/**
 * A list of urls of which the files will be downloaded and placed in .denoTypes/urlImports
 */
const DOWNLOAD_TYPE_URLS = [
	"https://esm.sh/rollup@2.61.1?pin=v64",
	"https://esm.sh/rollup-plugin-jscc@2.0.0?pin=v64",
	"https://unpkg.com/rollup-plugin-cleanup@3.2.1/index.d.ts",
	"https://deno.land/std@0.121.0/path/mod.ts",
	"https://deno.land/x/chdir_anywhere@v0.0.2/mod.js",
	"https://deno.land/std@0.135.0/testing/asserts.ts",
	"https://deno.land/std@0.135.0/testing/mock.ts",
	"https://deno.land/std@0.135.0/node/module.ts",
	"https://deno.land/x/fake_imports@v0.4.0/mod.js",
	"https://raw.githubusercontent.com/jespertheend/fake-dom/main/src/FakeDocument.js",
	"https://raw.githubusercontent.com/jespertheend/fake-dom/main/src/FakeMouseEvent.js",
	"https://raw.githubusercontent.com/jespertheend/fake-dom/main/src/FakePointerEvent.js",
	"https://raw.githubusercontent.com/jespertheend/fake-dom/main/src/mockGetComputedStyle.js",
	"https://raw.githubusercontent.com/jespertheend/fake-dom/main/src/FakeMouseEvent.js",
	"https://raw.githubusercontent.com/jespertheend/fake-dom/main/src/FakeMouseEvent.js",
	"https://deno.land/x/puppeteer@9.0.2/mod.ts",
	"https://deno.land/x/fake_imports@v0.1.0/mod.js",
	"https://deno.land/std@0.127.0/http/file_server.ts",
	"https://deno.land/std@0.127.0/http/server.ts",
];

/**
 * A list of npm @types/packagename packages that will be downloaded and placed in .denoTypes/@types/packagename
 */
const DOWNLOAD_DTS_PACKAGES = [
	"@types/wicg-file-system-access@2020.9.5/index.d.ts",
	"@webgpu/types@0.1.14/dist/index.d.ts",
];

const thisScriptContent = await Deno.readFile("./scripts/dev.js");
const textEncoder = new TextEncoder();
const denoVersionBuffer = textEncoder.encode(Deno.version.deno);
const bufferForHash = new Uint8Array(thisScriptContent.byteLength + denoVersionBuffer.byteLength);
bufferForHash.set(thisScriptContent, 0);
bufferForHash.set(denoVersionBuffer, thisScriptContent.byteLength);

const currentHash = await hashBuffer(bufferForHash);

let previousHash = null;
try {
	previousHash = await Deno.readTextFile(HASH_STORAGE_PATH);
} catch {
	// Asume this script has never been run before
}

if ((currentHash != previousHash || Deno.args.includes("--force-fts")) && !Deno.args.includes("--no-fts")) {
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
	async function writeTypesFile(url, dtsContent, {
		rootPath = ".denoTypes/urlImports",
	} = {}) {
		let filePath = url;
		filePath = filePath.replaceAll(":", "_");
		const fullPath = join(rootPath, filePath);
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

	for (const packageUrl of DOWNLOAD_DTS_PACKAGES) {
		const promise = (async () => {
			const url = `https://unpkg.com/${packageUrl}`;
			console.log(`Fetching types for "${url}"`);
			const dtsResponse = await fetch(url);
			if (dtsResponse.ok) {
				const text = await dtsResponse.text();
				let rootPath = ".denoTypes/";
				let filePath = packageUrl;
				if (!packageUrl.startsWith("@types/")) {
					// This is really only for the webgpu types. The webgpu types are not published under the @types/
					// namespace, so we need to make some adjustments to make things work right.
					// Since Deno contains types for webgpu as well, we want to overwrite them, as they are more
					// outdated than the @types/webgpu packge. Typescript seems to load types in alphabetical order,
					// so we'll prefix it with aa to make sure it takes precedence.
					filePath = "aa_webgpu/index.d.ts";
					rootPath += "@types/";
				}
				await writeTypesFile(filePath, text, {rootPath});
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
		cmd: ["deno", "task", "build-editor-dependencies"],
	});
	await setupProcess.status();

	console.log("First time set up done.");
}

const buildProcess = Deno.run({
	cmd: ["deno", "task", "build-editor-dev"],
});
// const editorDiscoveryProcess = Deno.run({
// 	cmd: ["./editor/editorDiscoveryServer/src/main.js"],
// });

await buildProcess.status();
// await editorDiscoveryProcess.status();

const builtInAssetsPath = resolve(Deno.cwd(), "./editor/builtInAssets/");
const devSocket = new DevSocket({
	builtInAssetsPath,
});
devSocket.init();

const port = 8080;
const fsRoot = Deno.cwd();
serve(request => {
	const url = new URL(request.url);
	if (url.pathname == "/devSocket") {
		return devSocket.webSocketManager.handleRequest(request);
	}
	return serveDir(request, {
		fsRoot,
		showDirListing: true,
		showDotfiles: true,
		quiet: true,
	});
}, {port});
console.log(`Server listening on localhost:${port}`);
