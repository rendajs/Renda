import { minify } from "terser";

const nameCache = {};

/**
 * A rollup plugin for minifying builds.
 * @param {import("terser").MinifyOptions} minifyOptions
 * @returns {import("$rollup").Plugin}
 */
export function rollupTerserPlugin(minifyOptions = {}) {
	return {
		name: "terser",
		async renderChunk(code, chunk, outputOptions) {
			const output = await minify(code, {
				...minifyOptions,
				nameCache,
			});
			if (!output.code) return null;
			return {
				code: output.code,
				map: output.map,
			};
		},
	};
}
