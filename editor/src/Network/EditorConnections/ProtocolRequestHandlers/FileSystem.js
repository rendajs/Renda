import {BinaryComposer, StorageType} from "../../../../../src/mod.js";
import {getEditorInstance} from "../../../editorInstance.js";

/** @type {import("../ProtocolManager.js").ProtocolManagerRequestHandler} */
const readDir = {
	command: "fileSystem.readDir",
	/**
	 * @param {import("../../../Util/FileSystems/EditorFileSystem.js").EditorFileSystemPath} path
	 */
	handleRequest: async path => {
		return await getEditorInstance().projectManager.currentProjectFileSystem.readDir(path);
	},
};

/** @type {import("../ProtocolManager.js").ProtocolManagerRequestHandler} */
const createDir = {
	command: "fileSystem.createDir",
	/**
	 * @param {import("../../../Util/FileSystems/EditorFileSystem.js").EditorFileSystemPath} path
	 */
	handleRequest: async path => {
		return await getEditorInstance().projectManager.currentProjectFileSystem.createDir(path);
	},
};

/** @type {import("../../../../../src/util/BinaryComposer.js").BinaryComposerObjectToBinaryOptions} */
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

/**
 * @param {File} file
 */
async function serializeFile(file) {
	return BinaryComposer.objectToBinary({
		buffer: await file.arrayBuffer(),
		name: file.name,
		type: file.type,
		lastModified: file.lastModified,
	}, serializeFileBinaryOpts);
}

/**
 * @param {ArrayBuffer} buffer
 */
function deserializeFile(buffer) {
	const fileData = BinaryComposer.binaryToObject(buffer, serializeFileBinaryOpts);
	return new File([fileData.buffer], fileData.name, {
		type: fileData.type,
		lastModified: fileData.lastModified,
	});
}

/**	@type {import("../ProtocolManager.js").ProtocolManagerRequestHandler} */
const readFile = {
	command: "fileSystem.readFile",
	needsRequestMetaData: true,
	/**
	 * @param {import("../ProtocolManager.js").RequestMetaData} meta
	 * @param {import("../../../Util/FileSystems/EditorFileSystem.js").EditorFileSystemPath} path
	 */
	handleRequest: async (meta, path) => {
		const file = await getEditorInstance().projectManager.currentProjectFileSystem.readFile(path);
		if (meta.autoSerializationSupported) {
			return file;
		} else {
			return await serializeFile(file);
		}
	},
	responseSerializeCondition: "never",
	handleResponse: async (meta, buffer) => {
		return deserializeFile(buffer);
	},
};

/** @type {import("../../../../../src/util/BinaryComposer.js").BinaryComposerObjectToBinaryOptions} */
const serializeWriteFileBinaryOpts = {
	structure: {
		path: [StorageType.STRING],
		file: StorageType.ARRAY_BUFFER,
	},
	nameIds: {
		path: 0,
		file: 1,
	},
};

/** @type {import("../ProtocolManager.js").ProtocolManagerRequestHandler} */
const writeFile = {
	command: "fileSystem.writeFile",
	needsRequestMetaData: true,
	requestSerializeCondition: "never",
	/**
	 * @param {import("../ProtocolManager.js").RequestMetaData} meta
	 * @param {import("../../../Util/FileSystems/EditorFileSystem.js").EditorFileSystemPath} path
	 * @param {File} file
	 */
	async prepare(meta, path, file) {
		/** @type {{path: string[], file: File | ArrayBuffer}} */
		const sendData = {path, file};
		if (meta.autoSerializationSupported) {
			return sendData;
		} else {
			sendData.file = await serializeFile(file);
			const buffer = BinaryComposer.objectToBinary(sendData, serializeWriteFileBinaryOpts);
			return buffer;
		}
	},
	/**
	 * @param {import("../ProtocolManager.js").RequestMetaData} meta
	 * @param {*} data
	 */
	async handleRequest(meta, data) {
		if (!meta.autoSerializationSupported) {
			const buffer = /** @type {ArrayBuffer} */ (data);
			data = BinaryComposer.binaryToObject(buffer, serializeWriteFileBinaryOpts);
			data.file = deserializeFile(data.file);
		}
		const parsedData = /** @type {{path: string[], file: File}} */ (data);
		const {path, file} = parsedData;
		return await getEditorInstance().projectManager.currentProjectFileSystem.writeFile(path, file);
	},
};

/**	@type {import("../ProtocolManager.js").ProtocolManagerRequestHandler} */
const isFile = {
	command: "fileSystem.isFile",
	/**
	 * @param {import("../../../Util/FileSystems/EditorFileSystem.js").EditorFileSystemPath} path
	 */
	handleRequest: async path => {
		return await getEditorInstance().projectManager.currentProjectFileSystem.isFile(path);
	},
};

/**	@type {import("../ProtocolManager.js").ProtocolManagerRequestHandler} */
const isDir = {
	command: "fileSystem.isDir",
	/**
	 * @param {import("../../../Util/FileSystems/EditorFileSystem.js").EditorFileSystemPath} path
	 */
	handleRequest: async path => {
		return await getEditorInstance().projectManager.currentProjectFileSystem.isDir(path);
	},
};

/**	@type {import("../ProtocolManager.js").ProtocolManagerRequestHandler} */
const exists = {
	command: "fileSystem.exists",
	/**
	 * @param {import("../../../Util/FileSystems/EditorFileSystem.js").EditorFileSystemPath} path
	 */
	handleRequest: async path => {
		return await getEditorInstance().projectManager.currentProjectFileSystem.exists(path);
	},
};

const fileSystemProtocolHandlers = [
	readDir,
	createDir,
	readFile,
	writeFile,
	isFile,
	isDir,
	exists,
];

export {fileSystemProtocolHandlers};
