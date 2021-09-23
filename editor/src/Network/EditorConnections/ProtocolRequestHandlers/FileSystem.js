import editor from "../../../editorInstance.js";

/** @type {import("../ProtocolManager.js").ProtocolManagerRequestHandler} */
const readDir = {
	command: "fileSystem.readDir",
	/**
	 * @param {import("../../../Util/FileSystems/EditorFileSystem.js").EditorFileSystemPath} path
	 */
	handleRequest: async path => {
		return await editor.projectManager.currentProjectFileSystem.readDir(path);
	},
};

/** @type {import("../ProtocolManager.js").ProtocolManagerRequestHandler} */
const createDir = {
	command: "fileSystem.createDir",
	/**
	 * @param {import("../../../Util/FileSystems/EditorFileSystem.js").EditorFileSystemPath} path
	 */
	handleRequest: async path => {
		return await editor.projectManager.currentProjectFileSystem.createDir(path);
	},
};

/**	@type {import("../ProtocolManager.js").ProtocolManagerRequestHandler} */
const readFile = {
	command: "fileSystem.readFile",
	/**
	 * @param {import("../../../Util/FileSystems/EditorFileSystem.js").EditorFileSystemPath} path
	 */
	handleRequest: async path => {
		return await editor.projectManager.currentProjectFileSystem.readFile(path);
	},
};

export default [
	readDir,
	createDir,
	readFile,
];
