import * as stdPath from "std/path/mod.ts";

/** @type {import("$rollup").PluginImpl} */
export function resolveWasmUrls() {
	return {
		name: "resolve-wasm-urls",
		async transform(code, id) {
			const re = /new\s+URL\s*\(\s*['"`](?<wasmUrl>.+\.wasm)['"`]\s*,\s*import\.meta\.url\s*\)/gid;
			for (const match of code.matchAll(re)) {
				if (!match.indices) continue;
				if (!match.indices.groups) continue;
				if (!match.groups) continue;
				const startUrlIndex = match.indices.groups.wasmUrl[0] - 1;
				const endUrlIndex = match.indices.groups.wasmUrl[1] + 1;
				let wasmUrl = match.groups.wasmUrl;
				if (!wasmUrl.match(/^.?.?\//)) {
					wasmUrl = "./" + wasmUrl;
				}

				const resolveResult = await this.resolve(wasmUrl, id, {
					attributes: {
						type: "webassembly",
					},
				});
				if (!resolveResult) continue;

				const parsedPath = stdPath.parse(resolveResult.id);

				const source = await Deno.readFile(resolveResult.id);
				const hashBuffer = await crypto.subtle.digest("SHA-256", source);
				const hashArray = Array.from(new Uint8Array(hashBuffer));
				const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
				const hash = hashHex.slice(0, 8);

				const chunkRefId = this.emitFile({
					type: "asset",
					fileName: `${parsedPath.name}-${hash}.wasm`,
					source,
				});
				const newUrl = `import.meta.ROLLUP_FILE_URL_${chunkRefId}`;

				code = code.substring(0, startUrlIndex) + newUrl + code.substring(endUrlIndex);
			}

			return {
				code,
			};
		},
	};
}
