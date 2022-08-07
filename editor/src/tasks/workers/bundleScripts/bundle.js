import transpiledRollup from "../../../../deps/rollup.browser.js";
import {resolvePlugin} from "./resolvePlugin.js";
import resolveUrlObjects from "../../../../deps/rollup-plugin-resolve-url-objects.js";

const rollup = /** @type {import("rollup")} */ (transpiledRollup);

/**
 * @param {import("../../task/TaskBundleScripts.js").TaskBundleScriptsConfig} config
 * @param {import("./mod.js").BundleScriptsMessenger} messenger
 */
export async function bundle(config, messenger) {
	const input = config.scriptPaths.map(p => p.join("/"));

	/** @type {import("./resolvePlugin.js").GetScriptContentFn} */
	const getScriptContentFn = async path => {
		return await messenger.send("getScriptContent", path);
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

	for (const chunkOrAsset of rollupOutput) {
		if (chunkOrAsset.type == "chunk") {
			const chunk = chunkOrAsset;
			const codeOutputPath = [...config.outputPath, chunk.fileName];
			let code = chunk.code;
			if (chunk.map) {
				const sourcemapName = chunk.fileName + ".map";
				const sourcemapPath = [...config.outputPath, sourcemapName];
				await messenger.send("writeText", sourcemapPath, JSON.stringify(chunk.map));

				code += "\n\n//# sourceMappingURL=./" + sourcemapName;
			}

			await messenger.send("writeText", codeOutputPath, code);
		}
		// todo: handle chunkOrAsset.type == "asset"
	}
}
