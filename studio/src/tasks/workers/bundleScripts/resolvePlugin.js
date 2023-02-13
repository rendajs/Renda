import {ENGINE_SOURCE_PATH} from "../../../studioDefines.js";

/**
 * @typedef {"project" | "engine" | "enginegenerated" | "remote"} ScriptType
 */

/** @type {ScriptType[]} */
const scriptTypes = [
	"project",
	"engine",
	"enginegenerated",
	"remote",
];

/**
 * @typedef {(id: import("../../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath) => Promise<string>} GetScriptContentFn
 */

/**
 * A rollup plugin for resolving file paths inside a worker.
 * @param {object} options
 * @param {GetScriptContentFn} options.getScriptContentFn
 * @param {string} options.servicesSource The generated code that will be placed
 * in the file that a user can import via "renda:services".
 * @return {import("rollup").Plugin}
 */
export function resolvePlugin({getScriptContentFn, servicesSource}) {
	return {
		name: "editor-resolve-scripts",
		resolveId(source, importer, opts) {
			const castThis = /** @type {import("rollup").PluginContext} */ (/** @type {unknown} */ (this));
			let importerInfo = null;
			if (importer) {
				importerInfo = castThis.getModuleInfo(importer);
			}
			let {scriptType, sourcePath} = getPathType(source);
			/** @type {ScriptType?} */
			const importerType = importerInfo?.meta?.editorResolve?.scriptType ?? null;
			scriptType = scriptType || importerType || null;

			const originalIsRelative = !sourcePath.startsWith("/");
			/** @type {string[]} */
			let resolvedPathArr = [];

			if (sourcePath == "renda") {
				scriptType = "engine";
				sourcePath = ENGINE_SOURCE_PATH;
			} else if (sourcePath == "renda:services") {
				scriptType = "enginegenerated";
				sourcePath = "services";
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
			/** @type {ScriptType?} */
			const scriptType = moduleInfo?.meta?.editorResolve?.scriptType ?? null;
			if (scriptType == "project") {
				return await getScriptContentFn(id.split("/"));
			} else if (scriptType == "engine") {
				const resp = await fetch(id);
				if (!resp.ok) {
					throw new Error(`Failed to load engine script at ${id}`);
				}
				return await resp.text();
			} else if (scriptType == "enginegenerated") {
				if (id == "services" && servicesSource) {
					return servicesSource;
				} else {
					// It is ok for this task to be called without a services source,
					// however, if one of the scripts contains "rena:services", this will fail.
					// At the moment we don't provide any way to configure the servicesSource via gui in studio.
					// So this option will only be set when the task is being called programmatically. At the moment
					// this is only being used by the build application task. Since returning `null` will cause
					// rollup to throw a rather generic error, we will throw our own custom error here.
					throw new Error(`Importing "renda:services" is only supported when building using the application task. It is recommended to configure a 'generate services' task and use the path of the generated file instead. If you insist on using "renda:services" you can either use an import map or run the 'bundle scripts' task programmatically and use the 'servicesSource' configuration option.`);
				}
			}
			return null;
		},
	};
}

/**
 * @typedef {object} GetPathTypeResult
 * @property {ScriptType?} scriptType
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
				if (scriptTypes.includes(type)) {
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
