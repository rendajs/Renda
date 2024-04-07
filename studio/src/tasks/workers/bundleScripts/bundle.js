import transpiledRollup from "../../../../deps/rollup.browser.js";
import { resolvePlugin } from "./resolvePlugin.js";
import resolveUrlObjects from "../../../../deps/rollup-plugin-resolve-url-objects.js";

const rollup = /** @type {import("rollup")} */ (transpiledRollup);

/**
 * @typedef BundleOptions
 * @property {string[]} inputPaths
 * @property {import("../../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} outputPath
 * @property {number} readScriptCallbackId
 * @property {string} servicesSource The code that the import specifier 'renda:services' will resolve with.
 */

/**
 * @typedef RunTaskCreateAssetBundleScriptsCustomData
 * @property {boolean} isEntry
 */

/**
 * @param {BundleOptions} options
 * @param {import("./mod.js").BundleScriptsMessenger} messenger
 */
export async function bundle({ inputPaths, outputPath, readScriptCallbackId, servicesSource }, messenger) {
	/** @type {import("./resolvePlugin.js").GetScriptContentFn} */
	const getScriptContentFn = async (path) => {
		const result = await messenger.send.getScriptContent(path, readScriptCallbackId);
		if (result == null) {
			throw new Error(`Failed to read script ${path}`);
		}
		return result;
	};

	const bundle = await rollup.rollup({
		input: inputPaths,
		plugins: [
			resolvePlugin({
				getScriptContentFn,
				servicesSource,
			}),
			resolveUrlObjects(),
		],
		preserveEntrySignatures: false,
	});
	const { output: rollupOutput } = await bundle.generate({
		format: "esm",
		sourcemap: true,
	});

	/** @type {import("../../task/Task.js").RunTaskCreateAssetData<RunTaskCreateAssetBundleScriptsCustomData>[]} */
	const writeAssets = [];

	for (const chunkOrAsset of rollupOutput) {
		if (chunkOrAsset.type == "chunk") {
			const chunk = chunkOrAsset;
			const codeOutputPath = [...outputPath, chunk.fileName];
			let code = chunk.code;
			if (chunk.map) {
				const sourcemapName = chunk.fileName + ".map";
				const sourcemapPath = [...outputPath, sourcemapName];
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
				customData: {
					isEntry: chunk.isEntry,
				},
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
