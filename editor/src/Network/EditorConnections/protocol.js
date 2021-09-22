import editor from "../../editorInstance.js";

/** @type {Map<keyof CmdParamsMap, (...rest: *[]) => Promise>} */
const handlers = new Map();
export default handlers;

/**
 * @param {import("../../Util/FileSystems/EditorFileSystem.js").EditorFileSystemPath} path
 */
export async function FileSystemReadDir(path) {
	return await editor.projectManager.currentProjectFileSystem.readDir(path);
}
handlers.set("fileSystem.readDir", FileSystemReadDir);

/**
 * @param {import("../../Util/FileSystems/EditorFileSystem.js").EditorFileSystemPath} path
 */
async function FileSystemCreateDir(path) {
	return await editor.projectManager.currentProjectFileSystem.createDir(path);
}
handlers.set("fileSystem.createDir", FileSystemCreateDir);

/**
 * @typedef {{
 * 	"fileSystem.readDir": FileSystemReadDir,
 * 	"fileSystem.createDir": FileSystemCreateDir,
 * }} CmdParamsMap
 */

/** @typedef {<C extends keyof CmdParamsMap>(cmd: C, ...arg: Parameters<CmdParamsMap[C]>) => ReturnType<CmdParamsMap[C]>} FunctionHandler */
