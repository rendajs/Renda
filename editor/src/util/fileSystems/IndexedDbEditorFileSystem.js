import {EditorFileSystem} from "./EditorFileSystem.js";
import {IndexedDbUtil} from "../../../../src/util/IndexedDbUtil.js";
import {generateUuid} from "../../../../src/util/util.js";

// eslint-disable-next-line no-unused-vars
const fileSystemPointerType = Symbol("file system pointer type");

/** @typedef {import("../../../../src/mod.js").UuidString & {__fileSystemPointerType: fileSystemPointerType}} IndexedDbEditorFileSystemPointer */

/**
 * @typedef {Object} IndexedDbEditorFileSystemStoredObjectBase
 * @property {boolean} [isFile = false]
 * @property {boolean} [isDir = false]
 * @property {string} fileName
 */

/**
 * @typedef {Object} IndexedDbEditorFileSystemStoredObjectFileType
 * @property {true} isFile
 * @property {false} [isDir = false]
 * @property {File} file
 *
 * @typedef {IndexedDbEditorFileSystemStoredObjectBase & IndexedDbEditorFileSystemStoredObjectFileType} IndexedDbEditorFileSystemStoredObjectFile
 */

/**
 * @typedef {Object} IndexedDbEditorFileSystemStoredObjectDirType
 * @property {true} isDir
 * @property {false} [isFile = false]
 * @property {IndexedDbEditorFileSystemPointer[]} files
 *
 * @typedef {IndexedDbEditorFileSystemStoredObjectBase & IndexedDbEditorFileSystemStoredObjectDirType} IndexedDbEditorFileSystemStoredObjectDir
 */

/** @typedef {IndexedDbEditorFileSystemStoredObjectFile | IndexedDbEditorFileSystemStoredObjectDir} IndexedDbEditorFileSystemStoredObject */

/**
 * @typedef {Object} IndexedDbEditorFileSystemTravelledDataItem
 * @property {IndexedDbEditorFileSystemStoredObject} obj
 * @property {IndexedDbEditorFileSystemPointer} pointer
 */

export class IndexedDbEditorFileSystem extends EditorFileSystem {
	/** @typedef {import("./EditorFileSystem.js").EditorFileSystemPath} EditorFileSystemPath */

	/**
	 * @param {string} fileSystemName The name of the FileSystem, will be used in the IndexedDB database name.
	 */
	constructor(fileSystemName) {
		super();

		const dbName = IndexedDbEditorFileSystem.getDbName(fileSystemName);
		/**
		 * Null if the db has been deleted.
		 * @type {IndexedDbUtil?}
		 */
		this.db = new IndexedDbUtil(dbName, {
			objectStoreNames: ["objects", "system"],
		});

		// create root directory
		this.rootCreated = false;
		/** @type {((...args: any) => any)[]} */
		this.onRootCreateCbs = [];
		this.createRoot();
	}

	assertDbExists() {
		if (!this.db) {
			throw new Error("Operation can't be performed. Db has been deleted.");
		}
		return this.db;
	}

	/**
	 * @param {IndexedDbEditorFileSystemStoredObject} obj
	 * @return {asserts obj is IndexedDbEditorFileSystemStoredObjectDir}
	 */
	assertIsDir(obj) {
		if (!obj.isDir) throw new Error(`Couldn't perform operation, ${obj.fileName} is not a directory.`);
	}

	/**
	 * Checks if the filesystem database with specified name exists.
	 * @param {string} fileSystemName
	 * @returns {Promise<boolean>}
	 */
	static async exists(fileSystemName) {
		const dbName = IndexedDbEditorFileSystem.getDbName(fileSystemName);
		const databases = await indexedDB.databases();
		return databases.some(db => db.name == dbName);
	}

	/**
	 * @param {string} fileSystemName
	 */
	static getDbName(fileSystemName) {
		return "fileSystem_" + fileSystemName;
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
	 * @returns {Promise<IndexedDbEditorFileSystemPointer>}
	 */
	async getRootPointer(waitForRootCreate = true) {
		if (waitForRootCreate) await this.waitForRootCreate();
		const db = this.assertDbExists();
		return await db.get("rootPointer", "system");
	}

	/**
	 * @param {IndexedDbEditorFileSystemPointer} pointer
	 * @returns {Promise<void>}
	 */
	async setRootPointer(pointer) {
		const db = this.assertDbExists();
		await db.set("rootPointer", pointer, "system");
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
		await this.updateObject(rootPointer, rootObj);
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
		const db = this.assertDbExists();
		this.db = null;
		await db.deleteDb();
	}

	/**
	 * @param {IndexedDbEditorFileSystemPointer} pointer
	 * @returns {Promise<IndexedDbEditorFileSystemStoredObject>}
	 */
	async getObject(pointer) {
		if (!pointer) throw new Error("pointer not specified");
		const db = this.assertDbExists();
		const obj = await db.get(pointer);
		if (!obj) throw new Error("The specified pointer does not exist");
		return obj;
	}

	/**
	 *
	 * @param {string[]} path
	 * @returns {Promise<{pointer: IndexedDbEditorFileSystemPointer, obj: IndexedDbEditorFileSystemStoredObject}>}
	 */
	async getObjectFromPath(path) {
		let pointer = await this.getRootPointer();
		let obj = await this.getObject(pointer);
		for (const dir of path) {
			let foundAny = false;
			this.assertIsDir(obj);
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
	 * @param {IndexedDbEditorFileSystemStoredObject} obj
	 */
	async createObject(obj) {
		const pointer = generateUuid();
		const db = this.assertDbExists();
		await db.set(pointer, obj);
		return /** @type {IndexedDbEditorFileSystemPointer} */ (pointer);
	}

	/**
	 * @override
	 * @param {EditorFileSystemPath} path
	 */
	async createDir(path) {
		const op = this.requestWriteOperation();
		super.createDir(path);
		await this.createDirInternal(path);
		op.done();
	}

	/**
	 * Same as createDir but returns travelled data.
	 * It is internal because the publicly facing api does not need to know
	 * about travelled data.
	 * @param {string[]} path
	 */
	async createDirInternal(path) {
		const travelledData = await this.findDeepestExisting(path);
		const recursionDepth = travelledData.length - 1;
		if (recursionDepth == path.length) return travelledData;
		const createDirs = path.slice(recursionDepth);
		createDirs.reverse();
		let lastCreatedPointer = null;
		/** @type {IndexedDbEditorFileSystemTravelledDataItem[]} */
		const extraTravelledData = [];
		for (const dir of createDirs) {
			/** @type {IndexedDbEditorFileSystemStoredObjectDir} */
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
		const lastFoundPathEntry = travelledData[travelledData.length - 1];
		const lastFoundObject = lastFoundPathEntry.obj;
		this.assertIsDir(lastFoundObject);
		if (!lastCreatedPointer) {
			throw new Error("Failed to get file pointer");
			// This should never be called because we already checked if the
			// directory existed above at `if (recursionDepth == path.length)`
		}
		lastFoundObject.files.push(lastCreatedPointer);
		await this.updateObject(lastFoundPathEntry.pointer, lastFoundObject);
		return [...travelledData, ...extraTravelledData];
	}

	/**
	 * @param {string[]} path
	 */
	async findDeepestExisting(path) {
		let currentPointer = await this.getRootPointer();
		let currentObj = await this.getObject(currentPointer);
		/** @type {IndexedDbEditorFileSystemTravelledDataItem[]} */
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

	/**
	 * @param {IndexedDbEditorFileSystemPointer} pointer
	 * @param {IndexedDbEditorFileSystemStoredObject} newData
	 */
	async updateObject(pointer, newData) {
		const db = this.assertDbExists();
		await db.set(pointer, newData);
	}

	/**
	 * @override
	 * @param {EditorFileSystemPath} path
	 */
	async readDir(path) {
		const {obj} = await this.getObjectFromPath(path);
		this.assertIsDir(obj);
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

	/**
	 * @override
	 * @param {string[]} fromPath
	 * @param {string[]} toPath
	 */
	async move(fromPath, toPath) {
		super.move(fromPath, toPath);
		this.fireOnBeforeAnyChange();

		// todo: error when this operation would overwrite existing files

		const travelledData = await this.findDeepestExisting(fromPath);
		// todo: error if file or directory doesn't exist
		const obj = travelledData[travelledData.length - 1];
		const parentObjPath = fromPath.slice(0, fromPath.length - 1);

		const parentObj = await this.getObjectFromPath(parentObjPath);
		this.assertIsDir(parentObj.obj);

		// remove old pointer
		const oldPointerIndex = parentObj.obj.files.indexOf(obj.pointer);
		parentObj.obj.files.splice(oldPointerIndex, 1);

		// rename
		const oldName = fromPath[fromPath.length - 1];
		const newName = toPath[toPath.length - 1];
		if (oldName != newName) {
			obj.obj.fileName = newName;
			await this.updateObject(obj.pointer, obj.obj);
		}

		// add new pointer to new parent
		const newParentPath = toPath.slice(0, toPath.length - 1);
		const newParentTravelledData = await this.createDirInternal(newParentPath);
		const newParentObj = newParentTravelledData[newParentTravelledData.length - 1];
		this.assertIsDir(newParentObj.obj);
		newParentObj.obj.files.push(obj.pointer);
		await this.updateObject(newParentObj.pointer, newParentObj.obj);
	}

	/**
	 * Deletes a file or directory.
	 * Will throw if the path does not exist.
	 * @override
	 * @param {EditorFileSystemPath} path The file or directory to delete.
	 * @param {boolean} recursive Whether to delete all subdirectories and files.
	 */
	async delete(path, recursive = false) {
		const writeOp = this.requestWriteOperation();
		if (path.length == 0) {
			throw new Error("Cannot delete the root directory");
		}
		super.delete(path, recursive);
		const travelledData = await this.findDeepestExisting(path);
		// todo: error if file or directory doesn't exist
		const lastTravelledItem = travelledData.at(-1);
		if (!lastTravelledItem) {
			throw new Error("Cannot delete the root directory");
		}
		const {obj, pointer} = lastTravelledItem;
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
		const db = this.assertDbExists();
		await db.delete(pointer);
		const parentObj = await this.getObjectFromPath(path.slice(0, path.length - 1));
		this.assertIsDir(parentObj.obj);
		const oldPointerIndex = parentObj.obj.files.indexOf(pointer);
		parentObj.obj.files.splice(oldPointerIndex, 1);
		await this.updateObject(parentObj.pointer, parentObj.obj);
		writeOp.done();
	}

	/**
	 * @override
	 * @param {Array<string>} path
	 * @param {import("./EditorFileSystem.js").AllowedWriteFileTypes} file
	 */
	async writeFile(path, file) {
		const writeOp = this.requestWriteOperation();
		this.fireOnBeforeAnyChange();
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
		this.assertIsDir(newParentObj.obj);

		// Remove existing pointer with the same name
		/** @type {IndexedDbEditorFileSystemPointer[]} */
		const deletePointers = [];
		for (const pointer of newParentObj.obj.files) {
			const fileObject = await this.getObject(pointer);
			if (fileObject.fileName == newFileName) {
				deletePointers.push(pointer);
			}
		}
		newParentObj.obj.files = newParentObj.obj.files.filter(pointer => !deletePointers.includes(pointer));
		const db = this.assertDbExists();
		for (const pointer of deletePointers) {
			await db.delete(pointer);
		}

		newParentObj.obj.files.push(newPointer);
		await this.updateObject(newParentObj.pointer, newParentObj.obj);
		writeOp.done();
	}

	/**
	 * @override
	 * @param {string[]} path
	 */
	async readFile(path) {
		const {obj} = await this.getObjectFromPath(path);
		if (!obj.isFile) {
			throw new Error(obj.fileName + " is not a file");
		}
		return obj.file;
	}

	/**
	 * @override
	 * @param {string[]} path
	 */
	async isFile(path) {
		try {
			const {obj} = await this.getObjectFromPath(path);
			return !!obj.isFile;
		} catch (e) {
			return false;
		}
	}

	/**
	 * @param {string[]} path
	 */
	async isDir(path) {
		try {
			const {obj} = await this.getObjectFromPath(path);
			return !!obj.isDir;
		} catch (e) {
			return false;
		}
	}
}
