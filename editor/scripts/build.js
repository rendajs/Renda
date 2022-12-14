import {rollup} from "rollup";
import {copy, ensureDir} from "std/fs/mod.ts";
import * as path from "std/path/mod.ts";
import {minify} from "terser";
import {setCwd} from "chdir-anywhere";
import {importAssertionsPlugin} from "https://esm.sh/rollup-plugin-import-assert@2.1.0?pin=v87";
import {importAssertions} from "https://esm.sh/acorn-import-assertions@1.8.0?pin=v87";
import postcss from "https://deno.land/x/postcss@8.4.13/mod.js";
import postcssUrl from "npm:postcss-url@10.1.3";
import resolveUrlObjects from "npm:rollup-plugin-resolve-url-objects@0.0.4";
import {dev} from "../../scripts/dev.js";
import {buildEngine} from "../../scripts/build.js";
import {toHashString} from "std/crypto/mod.ts";

await dev();

setCwd();

try {
	await Deno.remove("../dist", {recursive: true});
} catch {
	// Already removed
}
await ensureDir("../dist");

await copy("../index.html", "../dist/index.html");
await copy("../internalDiscovery.html", "../dist/internalDiscovery.html");
await copy("../static/", "../dist/static/");
await copy("../builtInAssets/", "../dist/builtInAssets/");

const engineSource = await buildEngine();
const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(engineSource));
const hashString = toHashString(hash).slice(0, 8);
const engineFileName = `renda-${hashString}.js`;
await Deno.writeTextFile("../dist/" + engineFileName, engineSource);

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
		name: "editor-replace-defines",
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
 * @param {Object} options
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

const editorDefines = {
	EDITOR_ENV: "production",
	IS_DEV_BUILD: false,
	ENGINE_SOURCE_PATH: engineFileName,
};
const EDITOR_ENTRY_POINT_PATH = "../src/main.js";
const INTERNAL_DISCOVERY_ENTRY_POINT_PATH = "../src/network/editorConnections/internalDiscovery/internalDiscoveryEntryPoint.js";
const bundle = await rollup({
	input: [
		EDITOR_ENTRY_POINT_PATH,
		INTERNAL_DISCOVERY_ENTRY_POINT_PATH,
	],
	plugins: [
		overrideDefines("/editor/src/editorDefines.js", editorDefines),
		resolveUrlObjects(),
		terser(),
		rebaseCssUrl({
			outputPath: path.resolve("../dist/"),
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
	dir: "../dist/",
	format: "esm",
	entryFileNames: "[name]-[hash].js",
});

const editorEntryPointPath = path.resolve(EDITOR_ENTRY_POINT_PATH);
const internalDiscoveryEntryPointPath = path.resolve(INTERNAL_DISCOVERY_ENTRY_POINT_PATH);
let bundleEntryPoint;
let internalDiscoveryEntryPoint;
for (const chunkOrAsset of output) {
	if (chunkOrAsset.type != "chunk") {
		throw new Error("Assertion failed, unexpected type: " + chunkOrAsset.type);
	}
	if (chunkOrAsset.facadeModuleId == editorEntryPointPath) {
		bundleEntryPoint = chunkOrAsset.fileName;
	} else if (chunkOrAsset.facadeModuleId == internalDiscoveryEntryPointPath) {
		internalDiscoveryEntryPoint = chunkOrAsset.fileName;
	}
}
if (!bundleEntryPoint) {
	throw new Error("Assertion failed: no editor entry point chunk was found");
}
if (!internalDiscoveryEntryPoint) {
	throw new Error("Assertion failed: no internal discovery entry point chunk was found");
}
await setHtmlAttribute("../dist/index.html", "editor script tag", bundleEntryPoint);
await setHtmlAttribute("../dist/internalDiscovery.html", "discovery script tag", internalDiscoveryEntryPoint);
