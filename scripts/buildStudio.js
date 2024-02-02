import {rollup} from "rollup";
import {copy, ensureDir, walk} from "std/fs/mod.ts";
import * as path from "std/path/mod.ts";
import {minify} from "terser";
import {setCwd} from "chdir-anywhere";
import {importAssertionsPlugin} from "https://esm.sh/rollup-plugin-import-assert@2.1.0?pin=v87";
import {importAssertions} from "https://esm.sh/acorn-import-assertions@1.8.0?pin=v87";
import postcss from "https://deno.land/x/postcss@8.4.13/mod.js";
import postcssUrl from "npm:postcss-url@10.1.3";
import resolveUrlObjects from "npm:rollup-plugin-resolve-url-objects@0.0.4";
import {dev} from "./dev.js";
import {buildEngine} from "./buildEngine.js";
import {toHashString} from "std/crypto/mod.ts";

await dev({
	needsDependencies: true,
});

setCwd();
Deno.chdir("../studio");

const outputPath = path.resolve("dist/");
try {
	await Deno.remove(outputPath, {recursive: true});
} catch {
	// Already removed
}
await ensureDir(outputPath);

await copy("index.html", path.resolve(outputPath, "index.html"));
await copy("internalDiscovery.html", path.resolve(outputPath, "internalDiscovery.html"));
await copy("static/", path.resolve(outputPath, "static/"));
await copy("builtInAssets/", path.resolve(outputPath, "builtInAssets/"));

const engineSource = await buildEngine();
const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(engineSource));
const hashString = toHashString(hash).slice(0, 8);
const engineFileName = `renda-${hashString}.js`;
await Deno.writeTextFile(path.resolve(outputPath, engineFileName), engineSource);

/**
 * Replaces the value of an attribute in a html file.
 * @param {string} filePath The location of the file to modify.
 * @param {string} tagComment The value of the comment that is placed above the to be modified tag.
 * @param {string} attributeValue The value to change the attribute of this tag to.
 * @param {string} attribute The attribute to replace.
 */
async function setHtmlAttribute(filePath, tagComment, attributeValue, attribute = "src") {
	const html = await Deno.readTextFile(filePath);
	let startPos = html.indexOf(`<!--${tagComment}-->`);
	const searchStr = `${attribute}="`;
	startPos = html.indexOf(searchStr, startPos);
	startPos += searchStr.length;
	const endPos = html.indexOf("\">", startPos);
	const newData = html.substring(0, startPos) + attributeValue + html.substring(endPos, html.length);
	const textEncoder = new TextEncoder();
	await Deno.writeFile(filePath, textEncoder.encode(newData));
}

/**
 * @param {string} definesFilePath
 * @param {Object<string, unknown>} defines
 * @returns {import("rollup").Plugin}
 */
function overrideDefines(definesFilePath, defines) {
	return {
		name: "studio-replace-defines",
		transform(code, id) {
			if (id.endsWith(definesFilePath)) {
				for (const [name, value] of Object.entries(defines)) {
					const re = new RegExp(name + "\\s?=.+;?$", "gm");
					code = code.replace(re, `${name} = ${JSON.stringify(value)};`);
				}
				return code;
			}
			return null;
		},
	};
}

/**
 * A rollup plugin for minifying builds.
 * @param {import("terser").MinifyOptions} minifyOptions
 * @returns {import("rollup").Plugin}
 */
function terser(minifyOptions = {}) {
	return {
		name: "terser",
		async renderChunk(code, chunk, outputOptions) {
			const output = await minify(code, minifyOptions);
			if (!output.code) return null;
			return {
				code: output.code,
			};
		},
	};
}

/**
 * A rollup plugin for remapping url() paths in css files.
 * @param {object} options
 * @param {string} options.outputPath The path where the Javascript files are
 * expected to be placed after bundling.
 */
function rebaseCssUrl({
	outputPath,
}) {
	/** @type {import("rollup").Plugin} */
	const plugin = {
		name: "rebaseCssUrl",
		async load(id) {
			if (id.endsWith(".css")) {
				const oldCss = await Deno.readTextFile(id);
				const newCss = await postcss([
					postcssUrl({
						url: "rebase",
					}),
				]).process(oldCss, {
					from: id,
					to: outputPath,
				});
				return newCss.css;
			}
		},
	};
	return plugin;
}

/**
 * @param {string} cmd
 */
async function runCmd(cmd) {
	const p = Deno.run({
		cmd: cmd.split(" "),
		stdout: "piped",
	});
	const status = await p.status();
	if (!status.success) {
		throw new Error(`Running "${cmd}" exited with status code ${status.code}`);
	}
	const outputBuffer = await p.output();
	let outputStr = new TextDecoder().decode(outputBuffer);
	p.close();
	outputStr = outputStr.trim();
	if (!outputStr) {
		throw new Error(`Running "${cmd}" resulted in an empty string`);
	}
	return outputStr;
}

let branch = Deno.env.get("GITHUB_HEAD_REF") || Deno.env.get("GITHUB_REF_NAME");
if (!branch) {
	branch = await runCmd("git branch --show-current");
}

let gitCommit = Deno.env.get("BUILD_COMMIT_SHA") || Deno.env.get("GITHUB_SHA");
if (!gitCommit) {
	gitCommit = await runCmd("git rev-parse HEAD");
}

const studioDefines = {
	STUDIO_ENV: "production",
	IS_DEV_BUILD: false,
	ENGINE_SOURCE_PATH: "./" + engineFileName,
	BUILD_GIT_BRANCH: branch,
	BUILD_GIT_COMMIT: gitCommit,
	BUILD_DATE: Date.now(),
};
const STUDIO_ENTRY_POINT_PATH = "src/main.js";
const INTERNAL_DISCOVERY_ENTRY_POINT_PATH = "src/network/studioConnections/internalDiscovery/internalDiscoveryIframeEntryPoint.js";
const SERVICE_WORKER_ENTRY_POINT_PATH = "sw.js";
const bundle = await rollup({
	input: [
		STUDIO_ENTRY_POINT_PATH,
		INTERNAL_DISCOVERY_ENTRY_POINT_PATH,
	],
	plugins: [
		overrideDefines("/studio/src/studioDefines.js", studioDefines),
		resolveUrlObjects(),
		// terser(),
		rebaseCssUrl({
			outputPath,
		}),
		importAssertionsPlugin(),
	],
	acornInjectPlugins: [importAssertions],
	onwarn: message => {
		if (message.code == "CIRCULAR_DEPENDENCY") return;
		console.error(message.message);
	},
	preserveEntrySignatures: false,
});
const {output} = await bundle.write({
	dir: outputPath,
	format: "esm",
	entryFileNames: "[name]-[hash].js",
});

/** @type {Map<string, string>} */
const entryPointPaths = new Map();
for (const chunkOrAsset of output) {
	if (chunkOrAsset.type != "chunk") {
		throw new Error("Assertion failed, unexpected type: " + chunkOrAsset.type);
	}
	if (chunkOrAsset.facadeModuleId) {
		entryPointPaths.set(chunkOrAsset.facadeModuleId, chunkOrAsset.fileName);
	}
}

/**
 * Takes a path to a JavaScript source file and returns the path which it was converted to when bundling.
 * @param {string} sourceEntryPointPath
 */
function getEntryPoint(sourceEntryPointPath) {
	const bundleEntryPoint = entryPointPaths.get(path.resolve(sourceEntryPointPath));
	if (!bundleEntryPoint) {
		throw new Error(`Assertion failed: no entry point chunk was found for "${sourceEntryPointPath}"`);
	}
	return bundleEntryPoint;
}

// Insert entry points into html files
const bundleEntryPoint = getEntryPoint(STUDIO_ENTRY_POINT_PATH);
await setHtmlAttribute(path.resolve(outputPath, "index.html"), "studio script tag", bundleEntryPoint);

const internalDiscoveryEntryPoint = getEntryPoint(INTERNAL_DISCOVERY_ENTRY_POINT_PATH);
await setHtmlAttribute(path.resolve(outputPath, "internalDiscovery.html"), "discovery script tag", internalDiscoveryEntryPoint);

// Insert all generated files into the service worker script
const swCacheFiles = [];
for await (const entry of walk(outputPath)) {
	if (entry.name.endsWith(".html")) continue;
	if (!entry.isFile) continue;
	const entryName = path.relative(outputPath, entry.path);
	swCacheFiles.push("./" + entryName);
}
const serviceWorkerEntryPoint = path.resolve(outputPath, getEntryPoint(SERVICE_WORKER_ENTRY_POINT_PATH));
let serviceWorkerContent = await Deno.readTextFile(serviceWorkerEntryPoint);
serviceWorkerContent = serviceWorkerContent.replace("/* GENERATED_FILES_INSERTION_TAG */", `"${swCacheFiles.join(`", "`)}",`);
await Deno.writeTextFile(serviceWorkerEntryPoint, serviceWorkerContent);
