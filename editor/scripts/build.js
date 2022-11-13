#!/usr/bin/env -S deno run --unstable --allow-read --allow-write --allow-net --allow-env

import {rollup} from "rollup";
import {copy, ensureDir} from "std/fs/mod.ts";
import {minify} from "terser";
import {setCwd} from "chdir-anywhere";
import {importAssertionsPlugin} from "https://esm.sh/rollup-plugin-import-assert@2.1.0?pin=v87";
import {importAssertions} from "https://esm.sh/acorn-import-assertions@1.8.0?pin=v87";
import {dev} from "../../scripts/dev.js";

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
await copy("../sw.js", "../dist/sw.js");

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

await setHtmlAttribute("../dist/index.html", "editor script tag", "./js/main.js");
await setHtmlAttribute("../dist/internalDiscovery.html", "discovery script tag", "../js/internalDiscovery.js");

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

const editorDefines = {
	EDITOR_ENV: "production",
	IS_DEV_BUILD: false,
};
const bundle = await rollup({
	input: [
		"../src/main.js",
		"../src/network/editorConnections/internalDiscovery/internalDiscovery.js",
	],
	plugins: [
		overrideDefines("/editor/src/editorDefines.js", editorDefines),
		// todo:
		// resolveUrlObjects(),
		terser(),
		importAssertionsPlugin(),
	],
	acornInjectPlugins: [importAssertions],
	onwarn: message => {
		if (message.code == "CIRCULAR_DEPENDENCY") return;
		console.error(message.message);
	},
});
await bundle.write({
	dir: "../dist/js/",
	format: "esm",
});
