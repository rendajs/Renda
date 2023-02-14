import {StorageType, binaryToObject, createObjectToBinaryOptions, objectToBinary} from "../../../../../src/util/binarySerialization.js";
import {getStudioInstance} from "../../../studioInstance.js";
import {createRequestHandler} from "./createRequestHandler.js";

function getCurrentFileSystem() {
	const fs = getStudioInstance().projectManager.currentProjectFileSystem;
	if (!fs) throw new Error("Assertion failed: no active file system.");
	return fs;
}

const readDir = createRequestHandler({
	command: "fileSystem.readDir",
	/**
	 * @param {import("../../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path
	 */
	handleRequest: async path => {
		return await getCurrentFileSystem().readDir(path);
	},
});

const createDir = createRequestHandler({
	command: "fileSystem.createDir",
	/**
	 * @param {import("../../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path
	 */
	handleRequest: async path => {
		return await getCurrentFileSystem().createDir(path);
	},
});

const serializeFileBinaryOpts = createObjectToBinaryOptions({
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
});

/**
 * @param {File} file
 */
async function serializeFile(file) {
	return objectToBinary({
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
	const fileData = binaryToObject(buffer, serializeFileBinaryOpts);
	return new File([fileData.buffer], fileData.name, {
		type: fileData.type,
		lastModified: fileData.lastModified,
	});
}

const readFile = createRequestHandler({
	command: "fileSystem.readFile",
	needsRequestMetaData: true,
	/**
	 * @param {import("../ProtocolManager.js").RequestMetaData} meta
	 * @param {import("../../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path
	 */
	handleRequest: async (meta, path) => {
		const file = await getCurrentFileSystem().readFile(path);
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
});

const serializeWriteFileBinaryOpts = createObjectToBinaryOptions({
	structure: {
		path: [StorageType.STRING],
		file: StorageType.ARRAY_BUFFER,
	},
	nameIds: {
		path: 0,
		file: 1,
	},
});

const writeFile = createRequestHandler({
	command: "fileSystem.writeFile",
	needsRequestMetaData: true,
	requestSerializeCondition: "never",
	/**
	 * @param {import("../ProtocolManager.js").RequestMetaData} meta
	 * @param {import("../../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path
	 * @param {import("../../../util/fileSystems/StudioFileSystem.js").AllowedWriteFileTypes} file
	 */
	async prepare(meta, path, file) {
		/** @type {{path: string[], file: import("../../../util/fileSystems/StudioFileSystem.js").AllowedWriteFileTypes}} */
		const sendData = {path, file};
		if (meta.autoSerializationSupported) {
			return sendData;
		} else {
			let sendFile;
			if (!(file instanceof File)) {
				sendFile = new File([file], "", {type: "application/octet-stream"});
			} else {
				sendFile = file;
			}
			sendData.file = await serializeFile(sendFile);
			const buffer = objectToBinary(sendData, serializeWriteFileBinaryOpts);
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
			data = binaryToObject(buffer, serializeWriteFileBinaryOpts);
			data.file = deserializeFile(data.file);
		}
		const parsedData = /** @type {{path: string[], file: File}} */ (data);
		const {path, file} = parsedData;
		return await getCurrentFileSystem().writeFile(path, file);
	},
});

const isFile = createRequestHandler({
	command: "fileSystem.isFile",
	/**
	 * @param {import("../../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path
	 */
	handleRequest: async path => {
		return await getCurrentFileSystem().isFile(path);
	},
});

const isDir = createRequestHandler({
	command: "fileSystem.isDir",
	/**
	 * @param {import("../../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path
	 */
	handleRequest: async path => {
		return await getCurrentFileSystem().isDir(path);
	},
});

const exists = createRequestHandler({
	command: "fileSystem.exists",
	/**
	 * @param {import("../../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path
	 */
	handleRequest: async path => {
		return await getCurrentFileSystem().exists(path);
	},
});

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
