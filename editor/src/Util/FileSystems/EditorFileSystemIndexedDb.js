import EditorFileSystem from "./EditorFileSystem.js";
import IndexedDbUtil from "../IndexedDbUtil.js";
import md5 from "../../../libs/md5.js";

/** @typedef {string} EditorFileSystemIndexedDbPointer */

/**
 * @typedef {Object} EditorFileSystemIndexedDbStoredObject
 * @property {boolean} [isFile = false]
 * @property {boolean} [isDir = false]
 * @property {string} fileName
 * @property {File} [file]
 * @property {EditorFileSystemIndexedDbPointer[]} [files]
 */

export default class EditorFileSystemIndexedDb extends EditorFileSystem {
	/** @typedef {import("./EditorFileSystem.js").EditorFileSystemPath} EditorFileSystemPath */

	/**
	 * @param {string} dbName The name of the FileSystem, will be used in the IndexedDB database name.
	 */
	constructor(dbName) {
		super();

		this.db = new IndexedDbUtil("fileSystem_" + dbName, ["objects", "system"]);

		// create root directory
		this.rootCreated = false;
		this.onRootCreateCbs = [];
		this.createRoot();
	}

	async createRoot() {
		const currentRootPointer = await this.getRootPointer(false);
		if (!currentRootPointer) {
			const rootPointer = await this.createObject({
				isDir: true,
				files: [],
				fileName: "",
			});
			await this.setRootPointer(rootPointer);
		}
		this.rootCreated = true;
		for (const cb of this.onRootCreateCbs) {
			cb();
		}
		this.onRootCreateCbs = [];
	}

	async waitForRootCreate() {
		if (this.rootCreated) return;
		await new Promise(r => this.onRootCreateCbs.push(r));
	}

	/**
	 * @param {boolean} waitForRootCreate
	 * @returns {Promise<EditorFileSystemIndexedDbPointer>}
	 */
	async getRootPointer(waitForRootCreate = true) {
		if (waitForRootCreate) await this.waitForRootCreate();
		return await this.db.get("rootPointer", "system");
	}

	/**
	 * @param {EditorFileSystemIndexedDbPointer} pointer
	 * @returns {Promise<void>}
	 */
	async setRootPointer(pointer) {
		await this.db.set("rootPointer", pointer, "system");
	}

	rootNameSetSupported = true;

	/**
	 * @override
	 * @param {string} name The new name of the root directory.
	 */
	async setRootName(name) {
		const rootPointer = await this.getRootPointer();
		const rootObj = await this.getObject(rootPointer);
		rootObj.fileName = name;
		const newPointer = await this.updateObject(rootPointer, rootObj);
		await this.setRootPointer(newPointer);
		super.setRootName(name);
	}

	/**
	 * @override
	 */
	async getRootName() {
		const rootPointer = await this.getRootPointer();
		const rootObj = await this.getObject(rootPointer);
		return rootObj.fileName;
	}

	async deleteDb() {
		await this.waitForRootCreate();
		await this.db.deleteDb();
	}

	/**
	 * @param {EditorFileSystemIndexedDbPointer} pointer
	 * @returns {Promise<EditorFileSystemIndexedDbStoredObject>}
	 */
	async getObject(pointer) {
		if (!pointer) throw new Error("pointer not specified");
		return await this.db.get(pointer);
	}

	/**
	 *
	 * @param {string[]} path
	 * @returns {Promise<{pointer: EditorFileSystemIndexedDbPointer, obj: EditorFileSystemIndexedDbStoredObject}>}
	 */
	async getObjectFromPath(path = []) {
		let pointer = await this.getRootPointer();
		let obj = await this.getObject(pointer);
		for (const dir of path) {
			if (!obj.isDir) throw new Error(dir + " is not a directory");
			let foundAny = false;
			for (const filePointer of obj.files) {
				const fileObj = await this.getObject(filePointer);
				if (fileObj.fileName == dir) {
					pointer = filePointer;
					obj = fileObj;
					foundAny = true;
					break;
				}
			}
			if (!foundAny) {
				throw new Error(dir + " does not exist");
			}
		}
		return {pointer, obj};
	}

	/**
	 * @param {EditorFileSystemIndexedDbStoredObject} obj
	 * @returns {Promise<EditorFileSystemIndexedDbPointer>} The pointer to the created object.
	 */
	async createObject(obj) {
		const textEncoder = new TextEncoder();
		let totalBufferLength = 0;

		const fileNameBuffer = textEncoder.encode(obj.fileName);
		totalBufferLength += fileNameBuffer.byteLength;

		let isDirBit = 0;
		if (obj.isDir) {
			isDirBit = 1;
		} else if (obj.isFile) {
			isDirBit = 2;
		}
		const isDirBuffer = new Uint8Array([isDirBit]);
		totalBufferLength += isDirBuffer.byteLength;

		let contentBuffer = null;
		if (obj.isDir) {
			const contentBuffers = [];
			let contentBufferLength = 0;
			for (const filePointer of obj.files) {
				const pointerBuffer = textEncoder.encode(filePointer);
				contentBuffers.push(pointerBuffer);
				contentBufferLength += pointerBuffer.byteLength;
			}
			contentBuffer = new Uint8Array(contentBufferLength);
			let parsedBytes = 0;
			for (const buffer of contentBuffers) {
				contentBuffer.set(buffer, parsedBytes);
				parsedBytes += buffer.byteLength;
			}
		} else if (obj.isFile) {
			const arrayBuffer = await obj.file.arrayBuffer();
			contentBuffer = new Uint8Array(arrayBuffer);
		}
		totalBufferLength += contentBuffer.byteLength;

		const randBuffer = new Uint8Array(32);
		for (let i = 0; i < randBuffer.byteLength; i++) {
			randBuffer[i] = Math.round(Math.random() * 255);
		}
		totalBufferLength += randBuffer.byteLength;

		const allBuffers = [fileNameBuffer, isDirBuffer, contentBuffer, randBuffer];
		const finalBuffer = new Uint8Array(totalBufferLength);
		let parsedBytes = 0;
		for (const buffer of allBuffers) {
			finalBuffer.set(buffer, parsedBytes);
			parsedBytes += buffer.byteLength;
		}
		const pointer = md5(finalBuffer);
		await this.db.set(pointer, obj);
		return pointer;
	}

	async createDir(path = []) {
		await this.createDirInternal(path);
	}

	/**
	 * @param {string[]} path
	 * @returns {Promise<{obj: EditorFileSystemIndexedDbStoredObject, pointer: EditorFileSystemIndexedDbPointer}[]>}
	 */
	async createDirInternal(path = []) {
		const travelledData = await this.findDeepestExisting(path);
		const recursionDepth = travelledData.length - 1;
		if (recursionDepth == path.length) return travelledData;
		const createDirs = path.slice(recursionDepth);
		createDirs.reverse();
		let lastCreatedPointer = null;
		const extraTravelledData = [];
		for (const dir of createDirs) {
			const createdObject = {
				isDir: true,
				files: [],
				fileName: dir,
			};
			if (lastCreatedPointer) {
				createdObject.files.push(lastCreatedPointer);
			}
			lastCreatedPointer = await this.createObject(createdObject);
			extraTravelledData.push({
				obj: createdObject,
				pointer: lastCreatedPointer,
			});
		}
		const lastFoundObject = travelledData[travelledData.length - 1].obj;
		lastFoundObject.files.push(lastCreatedPointer);
		await this.updateObjectRecursiveUp(travelledData, lastFoundObject);
		return [...travelledData, ...extraTravelledData];
	}

	/**
	 * @param {string[]} path
	 * @returns {Promise<{obj: EditorFileSystemIndexedDbStoredObject, pointer: EditorFileSystemIndexedDbPointer}[]>}
	 */
	async findDeepestExisting(path = []) {
		let currentPointer = await this.getRootPointer();
		let currentObj = await this.getObject(currentPointer);
		const travelledData = [
			{
				obj: currentObj,
				pointer: currentPointer,
			},
		];
		let i = 0;
		for (const dirName of path) {
			i++;
			if (currentObj.isFile) {
				if (i < path.length) {
					throw new Error(dirName + " is a file");
				}
			} else if (currentObj.isDir) {
				let foundChild = false;
				for (const filePointer of currentObj.files) {
					const childObj = await this.getObject(filePointer);
					if (!childObj) continue;
					if (childObj.fileName == dirName) {
						currentObj = childObj;
						currentPointer = filePointer;
						travelledData.push({
							obj: childObj,
							pointer: filePointer,
						});
						foundChild = true;
						break;
					}
				}
				if (!foundChild) {
					break;
				}
			}
		}
		return travelledData;
	}

	async updateObjectRecursiveUp(travelledData, newObject) {
		for (let i = travelledData.length - 1; i >= 0; i--) {
			const item = travelledData[i];
			const newPointer = await this.updateObject(item.pointer, newObject);
			if (i > 0) {
				const parentItem = travelledData[i - 1];
				newObject = parentItem.obj;

				// remove old pointer from parent dir
				const oldPointerIndex = newObject.files.indexOf(item.pointer);
				newObject.files.splice(oldPointerIndex, 1);

				// add new pointer to parent dir
				newObject.files.push(newPointer);
			} else {
				await this.setRootPointer(newPointer);
			}
		}
	}

	async updateObject(oldPointer, newObject) {
		await this.db.delete(oldPointer);
		return await this.createObject(newObject);
	}

	async readDir(path = []) {
		const {obj} = await this.getObjectFromPath(path);
		const files = [];
		const directories = [];
		for (const filePointer of obj.files) {
			const fileObj = await this.getObject(filePointer);
			if (fileObj.isDir) {
				directories.push(fileObj.fileName);
			} else if (fileObj.isFile) {
				files.push(fileObj.fileName);
			}
		}
		return {files, directories};
	}

	async move(fromPath = [], toPath = []) {
		const travelledData = await this.findDeepestExisting(fromPath);
		// todo: error if file or directory doesn't exist
		const oldObject = travelledData[travelledData.length - 1];
		const parentObjPath = fromPath.slice(0, fromPath.length - 1);
		const parentObjTravelledData = travelledData.slice(0, travelledData.length - 1);

		const parentObj = await this.getObjectFromPath(parentObjPath);

		// remove old pointer
		const oldPointerIndex = parentObj.obj.files.indexOf(oldObject.pointer);
		parentObj.obj.files.splice(oldPointerIndex, 1);
		await this.updateObjectRecursiveUp(parentObjTravelledData, parentObj.obj);

		// rename
		const oldName = fromPath[fromPath.length - 1];
		const newName = toPath[toPath.length - 1];
		let newPointer = oldObject.pointer;
		if (oldName != newName) {
			oldObject.obj.fileName = newName;
			newPointer = await this.updateObject(oldObject.pointer, oldObject.obj);
		}

		// add new pointer to new parent
		const newParentPath = toPath.slice(0, toPath.length - 1);
		const newParentTravelledData = await this.createDirInternal(newParentPath);
		const newParentObj = newParentTravelledData[newParentTravelledData.length - 1];
		newParentObj.obj.files.push(newPointer);
		await this.updateObjectRecursiveUp(newParentTravelledData, newParentObj.obj);
	}

	/**
	 * Deletes a file or directory.
	 * Will throw if the path does not exist.
	 * @override
	 * @param {EditorFileSystemPath} path The file or directory to delete.
	 * @param {Boolean} recursive Whether to delete all subdirectories and files.
	 */
	async delete(path = [], recursive = false) {
		if (path.length == 0) {
			throw new Error("Cannot delete root directory");
		}
		const travelledData = await this.findDeepestExisting(path);
		const parentObjTravelledData = travelledData.slice(0, travelledData.length - 1);
		// todo: error if file or directory doesn't exist
		const {obj, pointer} = travelledData.at(-1);
		if (obj.isDir && recursive) {
			for (const filePointer of obj.files) {
				const fileObj = await this.getObject(filePointer);
				const filePath = [...path, fileObj.fileName];
				if (fileObj.isDir) {
					await this.delete(filePath, recursive);
				} else if (fileObj.isFile) {
					await this.delete(filePath);
				}
			}
		}
		await this.db.delete(pointer);
		const parentObj = await this.getObjectFromPath(path.slice(0, path.length - 1));
		const oldPointerIndex = parentObj.obj.files.indexOf(pointer);
		parentObj.obj.files.splice(oldPointerIndex, 1);
		await this.updateObjectRecursiveUp(parentObjTravelledData, parentObj.obj);
	}

	/**
	 * @override
	 * @param {Array<String>} path
	 * @param {File | BufferSource | Blob | string} file
	 */
	async writeFile(path = [], file = null) {
		if (!file) file = new Blob();
		const fileName = path[path.length - 1];
		let type = "";
		let lastModified = Date.now();
		if (file instanceof File) {
			type = file.type;
			lastModified = file.lastModified;
		}
		const createdFile = new File([file], fileName, {type, lastModified});
		const newParentPath = path.slice(0, path.length - 1);
		const newParentTravelledData = await this.createDirInternal(newParentPath);
		const newFileName = path[path.length - 1];
		const newPointer = await this.createObject({
			isFile: true,
			file: createdFile,
			fileName: newFileName,
		});
		const newParentObj = newParentTravelledData[newParentTravelledData.length - 1];

		// Remove existing pointer with the same name
		const deletePointers = [];
		for (const pointer of newParentObj.obj.files) {
			const fileObject = await this.getObject(pointer);
			if (fileObject.fileName == newFileName) {
				deletePointers.push(pointer);
			}
		}
		newParentObj.obj.files = newParentObj.obj.files.filter(pointer => !deletePointers.includes(pointer));
		for (const pointer of deletePointers) {
			await this.db.delete(pointer);
		}

		newParentObj.obj.files.push(newPointer);
		await this.updateObjectRecursiveUp(newParentTravelledData, newParentObj.obj);
	}

	async readFile(path = []) {
		const {obj} = await this.getObjectFromPath(path);
		if (!obj.isFile) {
			throw new Error(obj.fileName + " is not a file");
		}
		return obj.file;
	}

	/**
	 * @override
	 * @param {string[]} path
	 * @returns {Promise<Boolean>}
	 */
	async isFile(path = []) {
		try {
			const {obj} = await this.getObjectFromPath(path);
			return obj.isFile;
		} catch (e) {
			return false;
		}
	}

	/**
	 * @param {string[]} path
	 * @returns {Promise<Boolean>}
	 */
	async isDir(path = []) {
		try {
			const {obj} = await this.getObjectFromPath(path);
			return obj.isDir;
		} catch (e) {
			return false;
		}
	}
}
