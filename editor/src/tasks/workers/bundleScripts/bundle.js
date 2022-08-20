import transpiledRollup from "../../../../deps/rollup.browser.js";
import {resolvePlugin} from "./resolvePlugin.js";
import resolveUrlObjects from "../../../../deps/rollup-plugin-resolve-url-objects.js";

const rollup = /** @type {import("rollup")} */ (transpiledRollup);

/**
 * @typedef BundleOptions
 * @property {import("../../task/TaskBundleScripts.js").TaskBundleScriptsConfig} config
 * @property {number} readScriptCallbackId
 */

/**
 * @param {BundleOptions} options
 * @param {import("./mod.js").BundleScriptsMessenger} messenger
 */
export async function bundle({config, readScriptCallbackId}, messenger) {
	const input = config.scriptPaths.map(p => p.join("/"));

	/** @type {import("./resolvePlugin.js").GetScriptContentFn} */
	const getScriptContentFn = async path => {
		const result = await messenger.send("getScriptContent", path, readScriptCallbackId);
		if (result == null) {
			throw new Error(`Failed to read script ${path}`);
		}
		return result;
	};

	const bundle = await rollup.rollup({
		input,
		plugins: [resolvePlugin(getScriptContentFn), resolveUrlObjects()],
		preserveEntrySignatures: false,
	});
	const {output: rollupOutput} = await bundle.generate({
		format: "esm",
		sourcemap: true,
	});

	/** @type {import("../../task/Task.js").RunTaskCreateAssetData[]} */
	const writeAssets = [];

	for (const chunkOrAsset of rollupOutput) {
		if (chunkOrAsset.type == "chunk") {
			const chunk = chunkOrAsset;
			const codeOutputPath = [...config.outputPath, chunk.fileName];
			let code = chunk.code;
			if (chunk.map) {
				const sourcemapName = chunk.fileName + ".map";
				const sourcemapPath = [...config.outputPath, sourcemapName];
				writeAssets.push({
					path: sourcemapPath,
					assetType: "renda:javascript",
					fileData: JSON.stringify(chunk.map),
				});

				code += "\n\n//# sourceMappingURL=./" + sourcemapName;
			}

			writeAssets.push({
				path: codeOutputPath,
				assetType: "renda:javascript",
				fileData: code,
			});
		}
		// todo: handle chunkOrAsset.type == "asset"
	}

	/** @type {import("../../task/Task.js").RunTaskReturn} */
	const result = {
		writeAssets,
	};
	return result;
}
