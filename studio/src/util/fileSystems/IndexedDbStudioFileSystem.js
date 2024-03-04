import { StudioFileSystem } from "./StudioFileSystem.js";
import { IndexedDbUtil } from "../../../../src/util/IndexedDbUtil.js";
import { generateUuid } from "../../../../src/util/util.js";
import { wait } from "../../../../src/util/Timeout.js";

// eslint-disable-next-line no-unused-vars
const fileSystemPointerType = Symbol("file system pointer type");

/** @typedef {import("../../../../src/mod.js").UuidString & {__fileSystemPointerType: fileSystemPointerType}} IndexedDbStudioFileSystemPointer */

/**
 * @typedef {object} IndexedDbStudioFileSystemStoredObjectBase
 * @property {boolean} [isFile = false]
 * @property {boolean} [isDir = false]
 * @property {string} fileName
 */

/**
 * @typedef {object} IndexedDbStudioFileSystemStoredObjectFileType
 * @property {true} isFile
 * @property {false} [isDir = false]
 * @property {File} file
 */
/**
 * @typedef {IndexedDbStudioFileSystemStoredObjectBase & IndexedDbStudioFileSystemStoredObjectFileType} IndexedDbStudioFileSystemStoredObjectFile
 */

/**
 * @typedef {object} IndexedDbStudioFileSystemStoredObjectDirType
 * @property {true} isDir
 * @property {false} [isFile = false]
 * @property {IndexedDbStudioFileSystemPointer[]} files
 */
/**
 * @typedef {IndexedDbStudioFileSystemStoredObjectBase & IndexedDbStudioFileSystemStoredObjectDirType} IndexedDbStudioFileSystemStoredObjectDir
 */

/** @typedef {IndexedDbStudioFileSystemStoredObjectFile | IndexedDbStudioFileSystemStoredObjectDir} IndexedDbStudioFileSystemStoredObject */

/**
 * @typedef {object} IndexedDbStudioFileSystemTravelledDataEntry
 * @property {IndexedDbStudioFileSystemStoredObject} obj
 * @property {IndexedDbStudioFileSystemPointer} pointer
 */

/**
 * How long the system lock queue needs to be before a warning gets logged
 * to the console.
 */
const SYSTEM_LOCK_QUEUE_LENGTH_FOR_WARNING = 20;

export class IndexedDbStudioFileSystem extends StudioFileSystem {
	/** @typedef {import("./StudioFileSystem.js").StudioFileSystemPath} StudioFileSystemPath */

	/**
	 * @param {string} fileSystemName The name of the FileSystem, will be used in the IndexedDB database name.
	 */
	constructor(fileSystemName) {
		super();

		const dbName = IndexedDbStudioFileSystem.getDbName(fileSystemName);
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

	// TODO: Add support for locking specific files only.

	/**
	 * The IndexedDb can be locked from multiple processes, and this requires us
	 * to poll the lock in order to find out when it is unlocked. But if we know
	 * that the system has been locked by this instance, we can skip polling and
	 * use this flag instead.
	 * This flag becomes true when this instance requests a lock, however, if
	 * a lock is already active in another process, this might also become true
	 * if this instance requests a lock during that time.
	 */
	#systemLockedByThisInstance = false;

	/** @type {(() => void)[]} */
	#onSystemUnlockQueueCbs = [];

	#systemUnlockQueueWarningState = false;

	/**
	 * This adds an entry to the database indicating that the system is being modified.
	 * Use this when modifying objects in the database other than the contents of files.
	 * If the system is already locked, the returned promise will resolve once it unlocks.
	 * The system is locked using a timestamp, in case of a failure to unlock the system.
	 * If the lock is older than a second it is ignored and automatically unlocked.
	 */
	async #getSystemLock() {
		const db = this.assertDbExists();
		if (this.#systemLockedByThisInstance) {
			/** @type {Promise<void>} */
			const promise = new Promise(r => {
				this.#onSystemUnlockQueueCbs.push(r);
				if (this.#onSystemUnlockQueueCbs.length > SYSTEM_LOCK_QUEUE_LENGTH_FOR_WARNING && !this.#systemUnlockQueueWarningState) {
					this.#systemUnlockQueueWarningState = true;
					console.warn(`The IndexedDb file system lock queue is longer than ${SYSTEM_LOCK_QUEUE_LENGTH_FOR_WARNING} entries! Consider awaiting file operations before starting a new one.`);
				}
			});
			await promise;
		}

		this.#systemLockedByThisInstance = true;

		// polling :(
		let locked = true;
		while (locked) {
			/** @type {typeof db.getSet<number>} */
			const getSetLock = db.getSet.bind(db);
			await getSetLock("systemLock", existingLock => {
				if (!existingLock || Date.now() - existingLock > 1_000) {
					locked = false;
					return Date.now();
				}
				return existingLock;
			}, "system");

			// Not sure what would be a good polling rate, we'll just use half the timeout
			if (locked) await wait(500);
		}

		return {
			unlock: async () => {
				await db.set("systemLock", 0, "system");
				this.#systemLockedByThisInstance = false;
				const cb = this.#onSystemUnlockQueueCbs.shift();
				if (this.#onSystemUnlockQueueCbs.length <= 0) {
					this.#systemUnlockQueueWarningState = false;
				}
				if (cb) cb();
			},
		};
	}

	/**
	 * @param {IndexedDbStudioFileSystemStoredObject} obj
	 * @return {asserts obj is IndexedDbStudioFileSystemStoredObjectDir}
	 */
	assertIsDir(obj, message = `Couldn't perform operation, ${obj.fileName} is not a directory.`) {
		if (!obj.isDir) throw new Error(message);
	}

	/**
	 * Checks if the filesystem database with specified name exists.
	 * @param {string} fileSystemName
	 * @returns {Promise<boolean?>} True or false if the database is known to exist,
	 * null if the browser has no support for querying a list of existing databases.
	 */
	static async exists(fileSystemName) {
		const dbName = this.getDbName(fileSystemName);
		let databases;
		try {
			databases = await indexedDB.databases();
		} catch {
			return null;
		}
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
	 * @template {boolean} [TWait = true]
	 * @param {TWait} waitForRootCreate
	 */
	async getRootPointer(waitForRootCreate = /** @type {TWait} */ (true)) {
		if (waitForRootCreate) await this.waitForRootCreate();
		const db = this.assertDbExists();
		/** @type {typeof db.get<IndexedDbStudioFileSystemPointer>} */
		const dbGetPointer = db.get.bind(db);
		const pointer = await dbGetPointer("rootPointer", "system");
		if (waitForRootCreate) {
			if (!pointer) throw new Error("Assertion failed, no root pointer was found");
			return pointer;
		}
		return /** @type {TWait extends true ? IndexedDbStudioFileSystemPointer : IndexedDbStudioFileSystemPointer?} */ (pointer || null);
	}

	/**
	 * @param {IndexedDbStudioFileSystemPointer} pointer
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
	 * @param {IndexedDbStudioFileSystemPointer} pointer
	 */
	async getObject(pointer) {
		if (!pointer) throw new Error("pointer not specified");
		const db = this.assertDbExists();
		/** @type {typeof db.get<IndexedDbStudioFileSystemStoredObject>} */
		const dbGetPointer = db.get.bind(db);
		const obj = await dbGetPointer(pointer);
		if (!obj) throw new Error("The specified pointer does not exist");
		return obj;
	}

	/**
	 * @param {string[]} path
	 * @param {object} options
	 * @param {string} [options.errorMessageActionName]
	 * @returns {Promise<{pointer: IndexedDbStudioFileSystemPointer, obj: IndexedDbStudioFileSystemStoredObject}>}
	 */
	async getObjectFromPath(path, {
		errorMessageActionName = "perform operation",
	} = {}) {
		let pointer = await this.getRootPointer();
		let obj = await this.getObject(pointer);
		const pathStr = path.join("/");
		for (const [i, dir] of path.entries()) {
			let foundAny = false;
			const failurePathStr = path.slice(0, i).join("/");
			const atText = pathStr == failurePathStr ? "" : ` "${pathStr}"`;
			this.assertIsDir(obj, `Failed to ${errorMessageActionName}${atText}, "${failurePathStr}" is not a directory.`);
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
				const failurePathStr = path.slice(0, i + 1).join("/");
				const atText = pathStr == failurePathStr ? "" : ` "${pathStr}"`;
				throw new Error(`Failed to ${errorMessageActionName}${atText}, "${failurePathStr}" does not exist.`);
			}
		}
		return { pointer, obj };
	}

	/**
	 * @param {IndexedDbStudioFileSystemStoredObject} obj
	 */
	async createObject(obj) {
		const pointer = generateUuid();
		const db = this.assertDbExists();
		await db.set(pointer, obj);
		return /** @type {IndexedDbStudioFileSystemPointer} */ (pointer);
	}

	/**
	 * @override
	 * @param {StudioFileSystemPath} path
	 */
	async createDir(path) {
		path = [...path];
		const op = this.requestWriteOperation();
		const { unlock } = await this.#getSystemLock();
		try {
			await this.createDirInternal(path, {
				errorMessageActionName: "createDir",
			});
		} finally {
			await unlock();
			op.done();
		}
	}

	/**
	 * Same as createDir but returns travelled data.
	 * It is internal because the publicly facing api does not need to know
	 * about travelled data.
	 * @private
	 * @param {string[]} path
	 */
	async createDirInternal(path, {
		errorMessageActionName = "perform operation",
		errorMessagePath = path,
	} = {}) {
		const travelledData = await this.findDeepestExisting(path);
		const recursionDepth = travelledData.length - 1;
		if (recursionDepth == path.length) return travelledData;
		const createDirs = path.slice(recursionDepth);
		createDirs.reverse();
		let lastCreatedPointer = null;
		/** @type {IndexedDbStudioFileSystemTravelledDataEntry[]} */
		const extraTravelledData = [];
		for (const [i, dir] of createDirs.entries()) {
			/** @type {IndexedDbStudioFileSystemStoredObjectDir} */
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
			this.fireChange({
				external: false,
				kind: "directory",
				path: path.slice(0, recursionDepth + i + 1),
				type: "created",
			});
		}
		const lastFoundPathEntry = travelledData[travelledData.length - 1];
		const lastFoundObject = lastFoundPathEntry.obj;
		const assertionPath = path.slice(0, travelledData.length - 1);
		const errorMessagePathStr = errorMessagePath.join("/");
		const assertionPathStr = assertionPath.join("/");
		const atText = errorMessagePathStr == assertionPathStr ? "" : ` "${errorMessagePathStr}"`;
		this.assertIsDir(lastFoundObject, `Failed to ${errorMessageActionName}${atText}, "${assertionPath.join("/")}" is not a directory.`);
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
		/** @type {IndexedDbStudioFileSystemTravelledDataEntry[]} */
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
	 * @param {IndexedDbStudioFileSystemPointer} pointer
	 * @param {IndexedDbStudioFileSystemStoredObject} newData
	 */
	async updateObject(pointer, newData) {
		const db = this.assertDbExists();
		await db.set(pointer, newData);
	}

	/**
	 * @override
	 * @param {StudioFileSystemPath} path
	 */
	async readDir(path) {
		const { unlock } = await this.#getSystemLock();
		try {
			const { obj } = await this.getObjectFromPath(path, {
				errorMessageActionName: "read",
			});
			this.assertIsDir(obj, `Failed to read, "${path.join("/")}" is not a directory.`);
			const { files, directories } = await this.readDirObject(obj);
			return {
				files: Array.from(files.keys()),
				directories: Array.from(directories.keys()),
			};
		} finally {
			await unlock();
		}
	}

	/**
	 * Internal helper function for getting all child objects of a directory object.
	 * @private
	 * @param {IndexedDbStudioFileSystemStoredObjectDir} dirObject
	 */
	async readDirObject(dirObject) {
		/** @type {Map<string, IndexedDbStudioFileSystemPointer>} */
		const files = new Map();
		/** @type {Map<string, IndexedDbStudioFileSystemPointer>} */
		const directories = new Map();
		for (const filePointer of dirObject.files) {
			const fileObj = await this.getObject(filePointer);
			if (fileObj.isDir) {
				directories.set(fileObj.fileName, filePointer);
			} else if (fileObj.isFile) {
				files.set(fileObj.fileName, filePointer);
			}
		}
		return { files, directories };
	}

	/**
	 * @override
	 * @param {string[]} fromPath
	 * @param {string[]} toPath
	 */
	async move(fromPath, toPath) {
		const writeOp = this.requestWriteOperation();
		const { unlock } = await this.#getSystemLock();

		try {
			const oldName = fromPath[fromPath.length - 1];
			const newName = toPath[toPath.length - 1];

			const travelledData = await this.findDeepestExisting(fromPath);
			if (travelledData.length - 1 != fromPath.length) {
				throw new Error(`Failed to move: The file or directory at "${fromPath.join("/")}" does not exist.`);
			}

			const newParentPath = toPath.slice(0, toPath.length - 1);
			const newParentTravelledData = await this.createDirInternal(newParentPath);
			const newParentEntry = newParentTravelledData[newParentTravelledData.length - 1];
			this.assertIsDir(newParentEntry.obj);

			// Check if toPath is an existing file
			const { files: existingFiles, directories: existingDirectories } = await this.readDirObject(newParentEntry.obj);
			if (existingFiles.has(newName)) {
				throw new Error(`Failed to move: "${toPath.join("/")}" is a file.`);
			}

			// Check if toPath is an existing directory
			const existingDirectoryPointer = existingDirectories.get(newName);
			if (existingDirectoryPointer) {
				const existingDirObj = await this.getObject(existingDirectoryPointer);
				this.assertIsDir(existingDirObj);
				const { files, directories } = await this.readDirObject(existingDirObj);
				if (files.size > 0 || directories.size > 0) {
					throw new Error(`Failed to move: "${toPath.join("/")}" is a non-empty directory.`);
				} else {
					// We need to remove the empty directory since we'll be moving the new directory here
					newParentEntry.obj.files = newParentEntry.obj.files.filter(pointer => pointer != existingDirectoryPointer);
					// No need to `updateObject` the newParentEntry since we'll do that later when adding the new directory.
				}
			}

			// rename
			const movingEntry = travelledData[travelledData.length - 1];
			if (oldName != newName) {
				movingEntry.obj.fileName = newName;
				await this.updateObject(movingEntry.pointer, movingEntry.obj);
			}

			const oldParentObjPath = fromPath.slice(0, fromPath.length - 1);
			const oldParentEntry = await this.getObjectFromPath(oldParentObjPath);

			// If the parent hasn't changed, we only need to update a single entry
			if (oldParentEntry.pointer == newParentEntry.pointer) {
				// remove old pointer
				newParentEntry.obj.files = newParentEntry.obj.files.filter(pointer => pointer != movingEntry.pointer);
				this.fireChange({
					external: false,
					kind: "file",
					path: toPath,
					type: "created",
				});

				// add new pointer to new parent
				newParentEntry.obj.files.push(movingEntry.pointer);
				await this.updateObject(newParentEntry.pointer, newParentEntry.obj);
				this.fireChange({
					external: false,
					kind: "unknown",
					path: fromPath,
					type: "deleted",
				});
			} else {
				// remove old pointer
				this.assertIsDir(oldParentEntry.obj);
				oldParentEntry.obj.files = oldParentEntry.obj.files.filter(pointer => pointer != movingEntry.pointer);
				await this.updateObject(oldParentEntry.pointer, oldParentEntry.obj);
				this.fireChange({
					external: false,
					kind: "file",
					path: toPath,
					type: "created",
				});

				// add new pointer to new parent
				newParentEntry.obj.files.push(movingEntry.pointer);
				await this.updateObject(newParentEntry.pointer, newParentEntry.obj);
				this.fireChange({
					external: false,
					kind: "unknown",
					path: fromPath,
					type: "deleted",
				});
			}
		} finally {
			await unlock();
			writeOp.done();
		}
	}

	/**
	 * Deletes a file or directory.
	 * Will throw if the path does not exist.
	 * @override
	 * @param {StudioFileSystemPath} path The file or directory to delete.
	 * @param {boolean} recursive Whether to delete all subdirectories and files.
	 */
	async delete(path, recursive = false) {
		path = [...path];
		const writeOp = this.requestWriteOperation();
		const { unlock } = await this.#getSystemLock();

		try {
			await this.#deleteInternal(path, recursive);
		} finally {
			await unlock();
			writeOp.done();
		}

		this.fireChange({
			external: false,
			kind: "unknown",
			path,
			type: "deleted",
		});
	}

	/**
	 * Same as `delete` but without locking so that it can be called recursively without getting stuck forever.
	 * @param {StudioFileSystemPath} path
	 * @param {boolean} recursive
	 */
	async #deleteInternal(path, recursive) {
		if (path.length == 0) {
			throw new Error("Cannot delete the root directory");
		}
		const travelledData = await this.findDeepestExisting(path);
		if (travelledData.length - 1 != path.length) {
			const fullPath = path.join("/");
			const failurePathStr = path.slice(0, travelledData.length).join("/");
			if (fullPath == failurePathStr) {
				throw new Error(`Failed to delete, "${fullPath}" does not exist.`);
			} else {
				throw new Error(`Failed to delete "${path.join("/")}", "${failurePathStr}" does not exist.`);
			}
		}
		const lastTravelledItem = travelledData.at(-1);
		if (!lastTravelledItem) {
			throw new Error("Cannot delete the root directory");
		}
		const { obj, pointer } = lastTravelledItem;
		if (obj.isDir) {
			if (!recursive) {
				if (obj.files.length > 0) {
					throw new Error(`Failed to delete "${path.join("/")}" because it is a non-empty directory. Use recursive = true to delete non-empty directories.`);
				}
			}
			for (const filePointer of obj.files) {
				const fileObj = await this.getObject(filePointer);
				const filePath = [...path, fileObj.fileName];
				if (fileObj.isDir) {
					await this.#deleteInternal(filePath, recursive);
				} else if (fileObj.isFile) {
					await this.#deleteInternal(filePath, false);
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
	}

	/**
	 * @override
	 * @param {string[]} path
	 * @param {import("./StudioFileSystem.js").AllowedWriteFileTypes} file
	 */
	async writeFile(path, file) {
		path = [...path];
		let createdNew = true;
		const writeOp = this.requestWriteOperation();
		const { unlock } = await this.#getSystemLock();
		try {
			let existingObject = null;
			try {
				existingObject = await this.getObjectFromPath(path);
			} catch {
				// The existing object either already is a file, or it doesn't exist.
				// Since we only need to check if the existing object is a directory, we won't throw here.
			}
			if (existingObject && existingObject.obj.isDir) {
				throw new Error(`Failed to write, "${path.join("/")}" is not a file.`);
			}

			if (!file) file = new Blob();
			const fileName = path[path.length - 1];
			let type = "";
			let lastModified = Date.now();
			if (file instanceof File) {
				type = file.type;
				lastModified = file.lastModified;
			}
			const createdFile = new File([file], fileName, { type, lastModified });
			const newParentPath = path.slice(0, path.length - 1);
			const newParentTravelledData = await this.createDirInternal(newParentPath, {
				errorMessagePath: path,
				errorMessageActionName: "write",
			});
			const newFileName = path[path.length - 1];
			const newParentObj = newParentTravelledData[newParentTravelledData.length - 1];
			this.assertIsDir(newParentObj.obj, `Failed to write "${path.join("/")}", "${newParentPath.join("/")}" is not a directory.`);

			const newPointer = await this.createObject({
				isFile: true,
				file: createdFile,
				fileName: newFileName,
			});

			// Remove existing pointer with the same name
			/** @type {IndexedDbStudioFileSystemPointer[]} */
			const deletePointers = [];
			for (const pointer of newParentObj.obj.files) {
				const fileObject = await this.getObject(pointer);
				if (fileObject.fileName == newFileName) {
					deletePointers.push(pointer);
					createdNew = false;
				}
			}
			newParentObj.obj.files = newParentObj.obj.files.filter(pointer => !deletePointers.includes(pointer));
			const db = this.assertDbExists();
			for (const pointer of deletePointers) {
				await db.delete(pointer);
			}

			newParentObj.obj.files.push(newPointer);
			await this.updateObject(newParentObj.pointer, newParentObj.obj);
		} finally {
			await unlock();
			writeOp.done();
		}

		this.fireChange({
			external: false,
			kind: "file",
			path,
			type: createdNew ? "created" : "changed",
		});
	}

	/**
	 * @override
	 * @param {string[]} path
	 */
	async readFile(path) {
		const { unlock } = await this.#getSystemLock();
		try {
			const { obj } = await this.getObjectFromPath(path, {
				errorMessageActionName: "read",
			});
			if (!obj.isFile) {
				const pathStr = path.join("/");
				throw new Error(`Failed to read, "${pathStr}" is not a file.`);
			}
			return obj.file;
		} finally {
			await unlock();
		}
	}

	/**
	 * @override
	 * @param {string[]} path
	 */
	async isFile(path) {
		const { unlock } = await this.#getSystemLock();
		try {
			const { obj } = await this.getObjectFromPath(path);
			return !!obj.isFile;
		} catch (e) {
			return false;
		} finally {
			await unlock();
		}
	}

	/**
	 * @param {string[]} path
	 */
	async isDir(path) {
		const { unlock } = await this.#getSystemLock();
		try {
			const { obj } = await this.getObjectFromPath(path);
			return !!obj.isDir;
		} catch (e) {
			return false;
		} finally {
			await unlock();
		}
	}
}
