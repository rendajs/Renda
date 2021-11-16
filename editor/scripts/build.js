#!/usr/bin/env node

import {rollup} from "rollup";
import {promises as fs} from "fs";
import process from "process";
import resolveUrlObjects from "rollup-plugin-resolve-url-objects";

const isDevBuild = process.argv.includes("--dev");

const defines = {
	EDITOR_ENV: isDevBuild ? "dev" : "production",
	IS_DEV_BUILD: isDevBuild,
};

async function setScriptSrc(filePath, tagComment, src) {
	const data = await fs.readFile(filePath, {encoding: "utf8"});
	let startPos = data.indexOf(`<!--${tagComment}-->`);
	const searchStr = "<script type=\"module\" src=\"";
	startPos = data.indexOf(searchStr, startPos);
	startPos += searchStr.length;
	const endPos = data.indexOf("\"></script>", startPos);
	const newData = data.substring(0, startPos) + src + data.substring(endPos, data.length);
	await fs.writeFile(filePath, newData);
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
		setScriptSrc("editor/dist/index.html", "editor script tag", "../src/index.js");
		setScriptSrc("editor/dist/internalDiscovery/index.html", "discovery script tag", "../src/Network/EditorConnections/InternalDiscovery/internalDiscovery.js");
		try {
			await fs.unlink("editor/dist/index.js");
		} catch (e) {
			// fail silently
		}
	} else {
		setScriptSrc("editor/dist/index.html", "editor script tag", "./js/index.js");
		setScriptSrc("editor/dist/internalDiscovery/index.html", "discovery script tag", "./js/internalDiscovery.js");
		const bundle = await rollup({
			input: [
				"editor/src/index.js",
				"editor/src/Network/EditorConnections/InternalDiscovery/internalDiscovery.js",
			],
			plugins: [
				overrideDefines("editor/src/editorDefines.js", defines),
				resolveUrlObjects(),
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
