/**
 * @typedef {"project" | "engine" | "remote" | null} ScriptType
 */

/**
 * @typedef {(id: import("../../../util/fileSystems/EditorFileSystem.js").EditorFileSystemPath) => Promise<string>} GetScriptContentFn
 */

/**
 * A rollup plugin for resolving file paths inside a worker.
 * @param {GetScriptContentFn} getScriptContentFn
 * @return {import("rollup").Plugin}
 */
export function resolvePlugin(getScriptContentFn) {
	return {
		name: "editor-resolve-scripts",
		resolveId(source, importer, opts) {
			const castThis = /** @type {import("rollup").PluginContext} */ (/** @type {unknown} */ (this));
			let importerInfo = null;
			if (importer) {
				importerInfo = castThis.getModuleInfo(importer);
			}
			let {scriptType, sourcePath} = getPathType(source);
			/** @type {ScriptType} */
			const importerType = importerInfo?.meta?.editorResolve?.scriptType ?? null;
			scriptType = scriptType || importerType || null;

			const originalIsRelative = !sourcePath.startsWith("/");
			/** @type {string[]} */
			let resolvedPathArr = [];

			if (sourcePath == "renda") {
				scriptType = "engine";
				sourcePath = "/dist/mod.js";
			}

			if (!scriptType) scriptType = "project";

			if (importer && importerType == scriptType && originalIsRelative) {
				resolvedPathArr = importer.split("/");
				resolvedPathArr.pop();
			}
			const sourcePathArr = sourcePath.split("/");
			for (const dir of sourcePathArr) {
				if (dir == ".") continue;
				if (dir == "..") {
					resolvedPathArr.pop();
				} else {
					resolvedPathArr.push(dir);
				}
			}
			const resolvedPath = resolvedPathArr.join("/");
			return {
				id: resolvedPath,
				meta: {
					editorResolve: {
						scriptType,
					},
				},
			};
		},
		async load(id) {
			const castThis = /** @type {import("rollup").PluginContext} */ (/** @type {unknown} */ (this));
			const moduleInfo = castThis.getModuleInfo(id);
			/** @type {ScriptType} */
			const scriptType = moduleInfo?.meta?.editorResolve?.scriptType ?? null;
			if (scriptType == "project") {
				try {
					return await getScriptContentFn(id.split("/"));
				} catch (e) {
					console.error("unable to read file at " + id + " it may not exist.");
				}
			} else if (scriptType == "engine") {
				const resp = await fetch(id);
				return await resp.text();
			}
			return null;
		},
	};
}

/**
 * @typedef {Object} GetPathTypeResult
 * @property {ScriptType} scriptType
 * @property {string} sourcePath
 */

/**
 * Splits the rollup id using the `:` character.
 * @param {string} id
 * @returns {GetPathTypeResult}
 */
function getPathType(id) {
	if (id) {
		const splitPath = id.split("/");
		if (splitPath.length > 0) {
			const splitFirst = splitPath[0].split(":");
			if (splitFirst.length > 1) {
				const type = /** @type {ScriptType} */ (splitFirst[0]);
				if (type == "project" || type == "engine" || type == "remote") {
					const pathNoType = id.slice(type.length + 1);
					return {
						scriptType: type,
						sourcePath: pathNoType,
					};
				}
			}
		}
	}
	return {
		scriptType: null,
		sourcePath: id,
	};
}
