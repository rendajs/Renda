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

/**	@type {import("../ProtocolManager.js").ProtocolManagerRequestHandler} */
const isFile = {
	command: "fileSystem.isFile",
	/**
	 * @param {import("../../../Util/FileSystems/EditorFileSystem.js").EditorFileSystemPath} path
	 */
	handleRequest: async path => {
		return await editor.projectManager.currentProjectFileSystem.isFile(path);
	},
};

/**	@type {import("../ProtocolManager.js").ProtocolManagerRequestHandler} */
const isDir = {
	command: "fileSystem.isDir",
	/**
	 * @param {import("../../../Util/FileSystems/EditorFileSystem.js").EditorFileSystemPath} path
	 */
	handleRequest: async path => {
		return await editor.projectManager.currentProjectFileSystem.isDir(path);
	},
};

/**	@type {import("../ProtocolManager.js").ProtocolManagerRequestHandler} */
const exists = {
	command: "fileSystem.exists",
	/**
	 * @param {import("../../../Util/FileSystems/EditorFileSystem.js").EditorFileSystemPath} path
	 */
	handleRequest: async path => {
		return await editor.projectManager.currentProjectFileSystem.exists(path);
	},
};

export default [
	readDir,
	createDir,
	readFile,
	isFile,
	isDir,
	exists,
];
