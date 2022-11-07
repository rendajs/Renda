import {SingleInstancePromise} from "../../../../src/util/SingleInstancePromise.js";
import {EditorFileSystem} from "./EditorFileSystem.js";

export class FsaEditorFileSystem extends EditorFileSystem {
	/**
	 * @typedef {object} WatchTreeNode
	 * @property {boolean} init If false, the file/directory has not been checked yet and shouldn't fire an external
	 * change callback when the last change time is older.
	 * @property {number} lastModified
	 * @property {"file" | "directory"} kind
	 * @property {Map<string, WatchTreeNode>} children
	 */

	/**
	 * @typedef {object} PermissionGrantedListener
	 * @property {Function} resolve
	 * @property {string[]} path
	 * @property {boolean} writable
	 */

	/**
	 * @typedef CurrentlyGettingFileCallbackData
	 * @property {(file: File) => void} resolve
	 * @property {(error: unknown) => void} reject
	 */

	/**
	 * @param {FileSystemDirectoryHandle} handle
	 */
	constructor(handle) {
		super();

		/** @type {FileSystemDirectoryHandle} */
		this.handle = handle;

		/** @type {WatchTreeNode} */
		this.watchTree = {
			init: false,
			lastModified: 0,
			kind: "directory",
			children: new Map(),
		};
		this.updateWatchTreeInstance = new SingleInstancePromise(async () => await this.updateWatchTree());
		/** @type {Map<string, Set<CurrentlyGettingFileCallbackData>>} */
		this.currentlyGettingFileCbs = new Map(); // <path, Set<cb>>

		/** @type {Set<PermissionGrantedListener>} */
		this.onPermissionGrantedListeners = new Set();
		this.updateWatchTreeInstance.run();
	}

	static async openUserDir() {
		const directoryHandle = await globalThis.showDirectoryPicker();
		return new FsaEditorFileSystem(directoryHandle);
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 * @param {object} opts
	 * @param {boolean} [opts.writable] Check for writable permissions if true.
	 * @param {boolean} [opts.prompt] If set to false, this method will not trigger any ui pop ups asking the user for permissions.
	 */
	async getPermission(path, {
		writable = true,
		prompt = false,
	} = {}) {
		let handle = /** @type {FileSystemHandle} */ (this.handle);
		for (let i = 0; i <= path.length; i++) {
			const hasPermission = await this.verifyHandlePermission(handle, {writable, prompt, error: false});
			if (!hasPermission) return false;

			if (i == path.length) return true;

			const dirName = path[i];
			const isLast = i == path.length - 1;
			const dirHandle = /** @type {FileSystemDirectoryHandle} */ (handle);
			try {
				handle = await dirHandle.getDirectoryHandle(dirName);
			} catch (e) {
				if (e instanceof DOMException && (e.name == "TypeMismatchError" || e.name == "NotFoundError")) {
					if (isLast) {
						try {
							handle = await dirHandle.getFileHandle(dirName);
						} catch (e) {
							if (e instanceof DOMException && (e.name == "TypeMismatchError" || e.name == "NotFoundError")) {
								return true;
							} else {
								return false;
							}
						}
					} else {
						return true;
					}
				} else {
					return false;
				}
			}
		}
		return false;
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path The path to get permissions for.
	 */
	async waitForPermission(path, {
		writable = true,
	} = {}) {
		const hasPermission = await this.getPermission(path, {writable});
		if (hasPermission) return;
		await new Promise(resolve => {
			this.onPermissionGrantedListeners.add({
				resolve,
				path,
				writable,
			});
		});
	}

	/**
	 * Iterates over the waitForPermission promises and resolves the ones that
	 * should be resolved.
	 * @param {boolean} writable
	 */
	checkOnPermissionGrantedListeners(writable) {
		for (const listener of this.onPermissionGrantedListeners) {
			if (!listener.writable || listener.writable == writable) {
				(async () => {
					if (await this.getPermission(listener.path, {writable: listener.writable})) {
						listener.resolve();
						this.onPermissionGrantedListeners.delete(listener);
					}
				})();
			}
		}
	}

	/**
	 * Utility function for verifying permissions on a specific handle.
	 * @param {FileSystemHandle} handle
	 * @param {object} opts
	 * @param {boolean} [opts.prompt] Whether to prompt the user if no permission has been granted yet.
	 * @param {boolean} [opts.writable] Whether to request write permission.
	 * @param {boolean} [opts.error] If true, will throw an error if the permission is denied.
	 * @returns {Promise<boolean>}
	 */
	async verifyHandlePermission(handle, {
		prompt = true,
		writable = true,
		error = true,
	} = {}) {
		const mode = /** @type {"read" | "readwrite"} */ (writable ? "readwrite" : "read");
		const opts = {mode};
		if (await handle.queryPermission(opts) == "granted") return true;
		if (prompt) {
			if (await handle.requestPermission(opts) == "granted") {
				this.checkOnPermissionGrantedListeners(writable);
				return true;
			}
		}
		if (error) throw new Error("Not enough file system permissions for this operation.");
		return false;
	}

	/**
	 * @param {Array<string>} path
	 * @param {object} opts
	 * @param {boolean} [opts.create] Whether to create the directory if it doesn't exist.
	 * @param {boolean} [opts.overrideError] If true, replaces system errors with one that prints the path.
	 * @param {string} [opts.errorMessageActionName] The error action to show in error messages
	 * when an error occurs.
	 * @param {string[]} [opts.errorMessagePath] The full path of the action that is trying to be performed.
	 * @returns {Promise<FileSystemDirectoryHandle>}
	 */
	async getDirHandle(path, {
		create = false,
		overrideError = true,
		errorMessageActionName = "perform action",
		errorMessagePath = path,
	} = {}) {
		let {handle} = this;
		let parsedPathDepth = 0;
		for (const dirName of path) {
			parsedPathDepth++;

			await this.verifyHandlePermission(handle, {writable: create});
			// Check if the directory already exists, so that we can fire a
			// different event type if it doesn't.
			let created = false;
			try {
				await handle.getDirectoryHandle(dirName);
			} catch (e) {
				created = true;
			}
			try {
				handle = await handle.getDirectoryHandle(dirName, {create});
			} catch (error) {
				if (overrideError) {
					const pathStr = errorMessagePath.join("/");
					const failurePathStr = path.slice(0, parsedPathDepth).join("/");
					// We'll want to keep an eye out for https://github.com/whatwg/fs/issues/57
					// since error types might change in the future.
					let end = ".";
					if (error instanceof DOMException) {
						if (error.name == "TypeMismatchError") {
							end = `, "${failurePathStr}" is not a directory.`;
						} else if (error.name == "NotFoundError") {
							end = `, "${failurePathStr}" does not exist.`;
						}
					}

					const atText = pathStr == failurePathStr ? "" : ` at "${pathStr}"`;
					const message = `Couldn't ${errorMessageActionName}${atText}${end}`;
					throw new Error(message, {cause: error});
				} else {
					throw error;
				}
			}
			if (created) {
				this.fireChange({
					external: false,
					kind: "directory",
					path,
					type: "created",
				});
			}
		}
		await this.verifyHandlePermission(handle, {writable: create});
		return handle;
	}

	/**
	 * @param {Array<string>} path
	 * @param {object} opts
	 * @param {boolean} [opts.create] Whether to create the file if it doesn't exist.
	 * @param {boolean} [opts.overrideError] If true, replaces system errors with one that prints the path.
	 * @param {string} [opts.errorMessageActionName] The error action to show in error messages
	 * when an error occurs.
	 */
	async getFileHandle(path = [], {
		create = false,
		overrideError = true,
		errorMessageActionName = "perform action",
	} = {}) {
		const {dirPath, fileName} = this.splitDirFileName(path);
		const dirHandle = await this.getDirHandle(dirPath, {
			create, overrideError,
			errorMessageActionName,
			errorMessagePath: path,
		});
		await this.verifyHandlePermission(dirHandle, {writable: create});
		let fileHandle = null;
		let created = false;
		try {
			// Set a timestamp slightly in the future, the File System Access API will
			// create a file for us and we don't know what lastModified value it will use,
			// but it likely won't be more than a second.
			if (create) this.setWatchTreeLastModified(path, Date.now() + 1000);

			// Check if the file already exists, so that we can fire a
			// different event type if it doesn't.
			try {
				await dirHandle.getFileHandle(fileName);
			} catch {
				created = true;
			}

			fileHandle = await dirHandle.getFileHandle(fileName, {create});

			// Now set the timestamp to the actual current time, since creating
			// the file likely took less than a second. If we don't do this
			// actual changes within this second will not fire watch events.
			// We don't actually know the exact lastModified value of the file
			// without reading it, but that's fine. The current time will
			// probably be older than the lastModified value of the file.
			if (create) this.setWatchTreeLastModified(path);
		} catch (error) {
			if (overrideError) {
				const pathStr = path.join("/");
				// We'll want to keep an eye out for https://github.com/whatwg/fs/issues/57
				// since error types might change in the future.
				let end = ".";
				if (error instanceof DOMException) {
					if (error.name == "TypeMismatchError") {
						end = `, "${pathStr}" is not a file.`;
					} else if (error.name == "NotFoundError") {
						end = `, "${pathStr}" does not exist.`;
					}
				}
				const message = `Couldn't ${errorMessageActionName}${end}`;
				throw new Error(message, {cause: error});
			} else {
				throw error;
			}
		}
		return {fileHandle, created};
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 */
	async readDir(path) {
		const handle = await this.getDirHandle(path, {
			errorMessageActionName: "readDir",
		});
		/** @type {import("./EditorFileSystem.js").EditorFileSystemReadDirResult} */
		const result = {
			files: [],
			directories: [],
		};
		for await (const [name, item] of handle.entries()) {
			if (item.kind == "directory") {
				result.directories.push(name);
			} else if (item.kind == "file") {
				result.files.push(name);
			}
		}
		return result;
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 */
	async createDir(path) {
		path = [...path];
		await this.getDirHandle(path, {create: true, errorMessageActionName: "createDir"});

		// Note that this also fires the event when the directory already
		// existed before the call.
		this.fireChange({
			external: false,
			kind: "directory",
			path,
			type: "created",
		});
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} fromPath
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} toPath
	 */
	async move(fromPath = [], toPath = []) {
		if (await this.isDir(fromPath)) {
			throw new Error("not yet implemented");
		}
		const file = await this.readFile(fromPath);
		await this.writeFile(toPath, file);
		await this.delete(fromPath);
	}

	/**
	 * @override
	 * @param {string} name
	 */
	async setRootName(name) {
		throw new Error("Changing the root name of fsa file systems is not supported.");
	}

	/**
	 * @override
	 */
	async getRootName() {
		return this.handle.name;
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 */
	async delete(path, recursive = false) {
		path = [...path];
		let handle = this.handle;
		for (const [i, name] of path.entries()) {
			await this.verifyHandlePermission(handle);
			if (i == path.length - 1) {
				await this.verifyHandlePermission(handle);
				await handle.removeEntry(name, {recursive});
			} else {
				handle = await handle.getDirectoryHandle(name);
			}
		}
		this.fireChange({
			external: false,
			kind: "unknown",
			path: [...path],
			type: "deleted",
		});
	}

	/**
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 */
	splitDirFileName(path) {
		const dirPath = path.slice(0, path.length - 1);
		const fileName = path[path.length - 1];
		return {dirPath, fileName};
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 */
	async readFile(path) {
		const jointPath = path.join("/");
		let cbs = this.currentlyGettingFileCbs.get(jointPath);
		if (cbs) {
			const cbs2 = cbs;
			return await new Promise((resolve, reject) => cbs2.add({resolve, reject}));
		} else {
			cbs = new Set();
			this.currentlyGettingFileCbs.set(jointPath, cbs);
		}
		let fileContent;
		let catchedError;
		try {
			const {fileHandle} = await this.getFileHandle(path, {
				errorMessageActionName: "readFile",
			});
			await this.verifyHandlePermission(fileHandle, {writable: false});
			fileContent = await fileHandle.getFile();
		} catch (e) {
			catchedError = e;
		}
		if (catchedError) {
			for (const {reject} of cbs) {
				reject(catchedError);
			}
		} else {
			if (!fileContent) throw new Error("Assertion failed, fileContent is undefined");
			for (const {resolve} of cbs) {
				resolve(fileContent);
			}
		}
		this.currentlyGettingFileCbs.delete(jointPath);
		if (catchedError) {
			throw catchedError;
		} else {
			return fileContent;
		}
	}

	/**
	 * @override
	 * @param {Array<string>} path
	 * @param {import("./EditorFileSystem.js").AllowedWriteFileTypes} file
	 */
	async writeFile(path, file) {
		path = [...path];
		const {fileStream, created} = await this.#writeFileStreamInternal(path, false, "writeFile");
		if (fileStream.locked) {
			throw new Error("File is locked, writing after lock is not yet implemented");
		}
		await fileStream.write(file);
		await fileStream.close();
		this.setWatchTreeLastModified(path);

		this.fireChange({
			external: false,
			kind: "file",
			path,
			type: created ? "created" : "changed",
		});
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 */
	async writeFileStream(path, keepExistingData = false) {
		const {fileStream} = await this.#writeFileStreamInternal(path, keepExistingData, "writeFileStream");
		return fileStream;
	}

	/**
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 * @param {boolean} keepExistingData
	 * @param {string} errorMessageActionName
	 */
	async #writeFileStreamInternal(path, keepExistingData, errorMessageActionName) {
		const {fileHandle, created} = await this.getFileHandle(path, {
			create: true,
			errorMessageActionName,
		});
		await this.verifyHandlePermission(fileHandle);
		const fileStream = await fileHandle.createWritable({keepExistingData});
		return {fileStream, created};
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 */
	async isFile(path) {
		try {
			await this.getFileHandle(path, {overrideError: false});
		} catch (e) {
			if (e instanceof DOMException && (e.name == "TypeMismatchError" || e.name == "NotFoundError")) {
				return false;
			} else {
				throw e;
			}
		}
		return true;
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 */
	async isDir(path) {
		try {
			await this.getDirHandle(path, {overrideError: false});
		} catch (e) {
			if (e instanceof DOMException && (e.name == "TypeMismatchError" || e.name == "NotFoundError")) {
				return false;
			} else {
				throw e;
			}
		}
		return true;
	}

	/**
	 * @override
	 */
	suggestCheckExternalChanges() {
		this.updateWatchTreeInstance.run();
	}

	async updateWatchTree() {
		/** @type {import("./EditorFileSystem.js").FileSystemChangeEvent[]} */
		const collectedChanges = [];

		await this.traverseWatchTree(this.watchTree, this.handle, collectedChanges);

		for (const change of collectedChanges) {
			this.fireChange(change);
		}
	}

	/**
	 * Traverse the file tree and check if the entries still match that of the
	 * watch tree. If not, the file has been changed externally and we'll fire
	 * an external change event.
	 * @param {WatchTreeNode} watchTree
	 * @param {FileSystemDirectoryHandle} dirHandle
	 * @param {import("./EditorFileSystem.js").FileSystemChangeEvent[]} collectedChanges
	 * @param {string[]} traversedPath
	 * @returns {Promise<boolean>} True if the file/dir and all of it's children were checked correctly.
	 */
	async traverseWatchTree(watchTree, dirHandle, collectedChanges, traversedPath = []) {
		if (!await this.verifyHandlePermission(dirHandle, {prompt: false, writable: false, error: false})) {
			return false;
		}
		let allChecked = true;
		const deletedNodes = new Set(watchTree.children.keys());
		for await (const [name, handle] of dirHandle.entries()) {
			deletedNodes.delete(name);
			if (!await this.verifyHandlePermission(handle, {prompt: false, writable: false, error: false})) {
				allChecked = false;
				continue;
			}
			const childNode = watchTree.children.get(name);
			if (handle.kind == "file") {
				const file = await handle.getFile();
				const {lastModified} = file;
				if (childNode && childNode.init && childNode.lastModified < lastModified) {
					collectedChanges.push({
						external: true,
						kind: handle.kind,
						path: [...traversedPath, name],
						type: "changed",
					});
				} else if ((!childNode || !childNode.init) && watchTree.init) {
					collectedChanges.push({
						external: true,
						kind: handle.kind,
						path: [...traversedPath, name],
						type: "created",
					});
				}
				if (!childNode || childNode.lastModified < lastModified) {
					watchTree.children.set(name, {
						init: true,
						lastModified,
						kind: handle.kind,
						children: new Map(),
					});
				}
			} else if (handle.kind == "directory") {
				if ((!childNode || !childNode.init) && watchTree.init) {
					collectedChanges.push({
						external: true,
						kind: handle.kind,
						path: [...traversedPath, name],
						type: "created",
					});
				}
				let dirWatchTree = watchTree.children.get(name);
				if (!dirWatchTree) {
					dirWatchTree = {
						init: false,
						lastModified: 0,
						kind: handle.kind,
						children: new Map(),
					};
					watchTree.children.set(name, dirWatchTree);
				}
				const newTraversedPath = [...traversedPath, name];
				const success = await this.traverseWatchTree(dirWatchTree, handle, collectedChanges, newTraversedPath);
				if (!success) {
					allChecked = false;
				}
			}
		}
		for (const name of deletedNodes) {
			const deletingNode = watchTree.children.get(name);
			if (deletingNode) {
				collectedChanges.push({
					external: true,
					kind: deletingNode.kind,
					path: [...traversedPath, name],
					type: "deleted",
				});
			}
			watchTree.children.delete(name);
		}
		if (allChecked) {
			watchTree.init = true;
		}
		return allChecked;
	}

	/**
	 * Set the lastModified value of a specific watchTree node.
	 * Useful if you want to pevent watch events from firing when files were
	 * changed from this application rather than externally.
	 * @param {string[]} path
	 * @param {number} lastModified
	 */
	setWatchTreeLastModified(path, lastModified = Date.now()) {
		let node = this.watchTree;
		for (const [i, name] of path.entries()) {
			const last = i == path.length - 1;
			if (last) {
				node.children.set(name, {
					init: true,
					lastModified,
					kind: "file",
					children: new Map(),
				});
			} else {
				const childNode = node.children.get(name);
				if (childNode) {
					node = childNode;
				} else {
					/** @type {WatchTreeNode} */
					const newNode = {
						init: true,
						lastModified,
						kind: "directory",
						children: new Map(),
					};
					node.children.set(name, newNode);
					node = newNode;
				}
			}
		}
	}
}
