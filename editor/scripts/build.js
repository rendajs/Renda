import {rollup} from "rollup";

import {setCwd} from "chdir-anywhere";
setCwd();

const isDevBuild = Deno.args.includes("--dev");

const defines = {
	EDITOR_ENV: isDevBuild ? "dev" : "production",
	IS_DEV_BUILD: isDevBuild,
};

/**
 * @param {string} filePath
 * @param {string} tagComment
 * @param {string} src
 */
async function setScriptSrc(filePath, tagComment, src) {
	const textDecoder = new TextDecoder();
	const fileData = await Deno.readFile(filePath);
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

/**
 * @param {string} definesFilePath
 * @param {Object.<string, unknown>} defines
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

(async () => {
	if (isDevBuild) {
		setScriptSrc("../dist/index.html", "editor script tag", "../src/main.js");
		setScriptSrc("../dist/internalDiscovery/index.html", "discovery script tag", "../src/Network/EditorConnections/InternalDiscovery/internalDiscovery.js");
		try {
			await Deno.remove("../dist/main.js");
		} catch {
			// fail silently
		}
	} else {
		setScriptSrc("../dist/index.html", "editor script tag", "./js/main.js");
		setScriptSrc("../dist/internalDiscovery/index.html", "discovery script tag", "./js/internalDiscovery.js");
		const bundle = await rollup({
			input: [
				"../src/main.js",
				"../src/Network/EditorConnections/InternalDiscovery/internalDiscovery.js",
			],
			plugins: [
				overrideDefines("../src/editorDefines.js", defines),
				// todo:
				// resolveUrlObjects(),
			],
			onwarn: message => {
				if (message.code == "CIRCULAR_DEPENDENCY") return;
				console.error(message.message);
			},
		});
		await bundle.write({
			dir: "../dist/js/",
			format: "esm",
		});
	}
})();
