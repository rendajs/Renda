#!/usr/bin/env node

import {createRequire} from "https://deno.land/std@0.110.0/node/module.ts";

// import resolveUrlObjects from "rollup-plugin-resolve-url-objects";

const require = createRequire(import.meta.url);
const {rollup} = require("rollup");

const isDevBuild = Deno.args.includes("--dev");

const defines = {
	EDITOR_ENV: isDevBuild ? "dev" : "production",
	IS_DEV_BUILD: isDevBuild,
};

async function setScriptSrc(filePath, tagComment, src) {
	const textDecoder = new TextDecoder();
	const fileData = await Deno.readFile(filePath, {encoding: "utf8"});
	const data = textDecoder.decode(fileData);
	let startPos = data.indexOf(`<!--${tagComment}-->`);
	const searchStr = "<script type=\"module\" src=\"";
	startPos = data.indexOf(searchStr, startPos);
	startPos += searchStr.length;
	const endPos = data.indexOf("\"></script>", startPos);
	const newData = data.substring(0, startPos) + src + data.substring(endPos, data.length);
	const textEncoder = new TextEncoder();
	await Deno.writeFile(filePath, textEncoder.encode(newData));
}

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

(async () => {
	if (isDevBuild) {
		setScriptSrc("editor/dist/index.html", "editor script tag", "../src/main.js");
		setScriptSrc("editor/dist/internalDiscovery/index.html", "discovery script tag", "../src/Network/EditorConnections/InternalDiscovery/internalDiscovery.js");
		try {
			await Deno.remove("editor/dist/main.js");
		} catch {
			// fail silently
		}
	} else {
		setScriptSrc("editor/dist/index.html", "editor script tag", "./js/main.js");
		setScriptSrc("editor/dist/internalDiscovery/index.html", "discovery script tag", "./js/internalDiscovery.js");
		const bundle = await rollup({
			input: [
				"editor/src/main.js",
				"editor/src/Network/EditorConnections/InternalDiscovery/internalDiscovery.js",
			],
			plugins: [
				overrideDefines("editor/src/editorDefines.js", defines),
				// todo:
				// resolveUrlObjects(),
			],
			onwarn: message => {
				if (message.code == "CIRCULAR_DEPENDENCY") return;
				console.error(message.message);
			},
		});
		await bundle.write({
			dir: "editor/dist/js/",
			format: "esm",
		});
	}
})();
