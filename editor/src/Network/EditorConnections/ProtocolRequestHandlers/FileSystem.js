import {BinaryComposer, StorageType} from "../../../../../src/index.js";
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

/** @type {import("../../../../../src/Util/BinaryComposer.js").BinaryComposerObjectToBinaryOptions} */
const serializeFileBinaryOpts = {
	structure: {
		buffer: StorageType.ARRAY_BUFFER,
		name: StorageType.STRING,
		type: StorageType.STRING,
		lastModified: StorageType.FLOAT64,
	},
	nameIds: {
		buffer: 0,
		name: 1,
		type: 2,
		lastModified: 3,
	},
};

/**	@type {import("../ProtocolManager.js").ProtocolManagerRequestHandler} */
const readFile = {
	command: "fileSystem.readFile",
	needsRequestMetaData: true,
	/**
	 * @param {import("../ProtocolManager.js").RequestMetaData} meta
	 * @param {import("../../../Util/FileSystems/EditorFileSystem.js").EditorFileSystemPath} path
	 */
	handleRequest: async (meta, path) => {
		const file = await editor.projectManager.currentProjectFileSystem.readFile(path);
		if (meta.autoSerializationSupported) {
			return file;
		} else {
			const buffer = BinaryComposer.objectToBinary({
				buffer: await file.arrayBuffer(),
				name: file.name,
				type: file.type,
				lastModified: file.lastModified,
			}, serializeFileBinaryOpts);
			return buffer;
		}
	},
	responseSerializeCondition: "never",
	handleResponse: async (meta, buffer) => {
		const fileData = BinaryComposer.binaryToObject(buffer, serializeFileBinaryOpts);
		return new File([fileData.buffer], fileData.name, {
			type: fileData.type,
			lastModified: fileData.lastModified,
		});
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
