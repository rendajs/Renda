import {SingleInstancePromise} from "../../../../src/util/SingleInstancePromise.js";
import {EditorFileSystem} from "./EditorFileSystem.js";

export class EditorFileSystemFsa extends EditorFileSystem {
	/**
	 * @typedef {Object} WatchTreeNode
	 * @property {boolean} init If false, the file/directory has not been checked yet and shouldn't fire an external
	 * change callback when the last change time is older.
	 * @property {number} lastModified
	 * @property {"file" | "directory"} kind
	 * @property {Map<string, WatchTreeNode>} children
	 */

	/**
	 * @typedef {Object} PermissionGrantedListener
	 * @property {Function} resolve
	 * @property {string[]} path
	 * @property {boolean} writable
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
		this.updateWatchTreeInstance = new SingleInstancePromise(async () => await this.updateWatchTree(), {once: false});
		this.currentlyGettingFileCbs = new Map(); // <path, Set<cb>>

		/** @type {Set<PermissionGrantedListener>} */
		this.onPermissionGrantedListeners = new Set();
		this.updateWatchTreeInstance.run(true);
	}

	static async openUserDir() {
		const directoryHandle = await globalThis.showDirectoryPicker();
		return new EditorFileSystemFsa(directoryHandle);
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 * @param {Object} opts
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
	 * @param {Object} opts
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
	 * @param {Object} opts
	 * @param {boolean} [opts.create] Whether to create the directory if it doesn't exist.
	 * @param {boolean} [opts.overrideError] If true, replaces system errors with one that prints the path.
	 * @returns {Promise<FileSystemDirectoryHandle>}
	 */
	async getDirHandle(path, {
		create = false,
		overrideError = true,
	} = {}) {
		let {handle} = this;
		let parsedPathDepth = 0;
		for (const dirName of path) {
			parsedPathDepth++;

			await this.verifyHandlePermission(handle, {writable: create});
			try {
				handle = await handle.getDirectoryHandle(dirName, {create});
			} catch (e) {
				const error = /** @type {any} */ (e);
				if (overrideError) {
					const pathStr = path.slice(0, parsedPathDepth).join("/") + "/";
					const message = `Failed to get directory handle for ${pathStr}`;
					throw new Error(message, {cause: error});
				} else {
					throw error;
				}
			}
		}
		await this.verifyHandlePermission(handle, {writable: create});
		return handle;
	}

	/**
	 * @param {Array<string>} path
	 * @param {Object} opts
	 * @param {boolean} [opts.create] Whether to create the file if it doesn't exist.
	 * @param {boolean} [opts.overrideError] If true, replaces system errors with one that prints the path.
	 * @returns {Promise<FileSystemFileHandle>}
	 */
	async getFileHandle(path = [], {
		create = false,
		overrideError = true,
	} = {}) {
		const {dirPath, fileName} = this.splitDirFileName(path);
		const dirHandle = await this.getDirHandle(dirPath, {create});
		await this.verifyHandlePermission(dirHandle, {writable: create});
		let fileHandle = null;
		try {
			if (create) this.setWatchTreeLastModified(path, Date.now() + 1000);
			fileHandle = await dirHandle.getFileHandle(fileName, {create});
			if (create) this.setWatchTreeLastModified(path);
		} catch (e) {
			const error = /** @type {any} */ (e);
			if (overrideError) {
				const pathStr = path.join("/");
				const message = `Failed to get file handle for ${pathStr}`;
				throw new Error(message, {cause: error});
			} else {
				throw error;
			}
		}
		return fileHandle;
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 */
	async readDir(path) {
		const handle = await this.getDirHandle(path);
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
		super.createDir(path);
		await this.getDirHandle(path, {create: true});
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
	 */
	async getRootName() {
		return this.handle.name;
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 */
	async delete(path, recursive = false) {
		super.delete(path, recursive);
		let handle = await this.handle;
		for (const [i, name] of path.entries()) {
			await this.verifyHandlePermission(handle);
			if (i == path.length - 1) {
				await this.verifyHandlePermission(handle);
				await handle.removeEntry(name, {recursive});
			} else {
				handle = await handle.getDirectoryHandle(name);
			}
		}
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
			return await new Promise((resolve, reject) => cbs.add({resolve, reject}));
		} else {
			cbs = new Set();
			this.currentlyGettingFileCbs.set(jointPath, cbs);
		}
		let fileContent;
		let catchedError;
		try {
			const fileHandle = await this.getFileHandle(path);
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
	 * @param {File | BufferSource | Blob | string} file
	 */
	async writeFile(path, file) {
		super.writeFile(path, file);
		const fileStream = await this.writeFileStream(path);
		if (!fileStream.locked) {
			await fileStream.write(file);
			await fileStream.close();
			this.setWatchTreeLastModified(path);
		}
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 */
	async writeFileStream(path, keepExistingData = false) {
		const fileHandle = await this.getFileHandle(path, {create: true});
		await this.verifyHandlePermission(fileHandle);
		this.fireOnBeforeAnyChange();
		const fileStream = await fileHandle.createWritable({keepExistingData});
		return fileStream;
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
	async suggestCheckExternalChanges() {
		this.updateWatchTreeInstance.run(true);
	}

	async updateWatchTree() {
		/** @type {import("./EditorFileSystem.js").FileSystemExternalChangeEvent[]} */
		const collectedChanges = [];

		await this.traverseWatchTree(this.watchTree, this.handle, collectedChanges);

		for (const change of collectedChanges) {
			this.fireExternalChange(change);
		}
	}

	/**
	 * @param {WatchTreeNode} watchTree
	 * @param {FileSystemDirectoryHandle} dirHandle
	 * @param {import("./EditorFileSystem.js").FileSystemExternalChangeEvent[]} collectedChanges
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
						kind: handle.kind,
						path: [...traversedPath, name],
						type: "changed",
					});
				} else if ((!childNode || !childNode.init) && watchTree.init) {
					collectedChanges.push({
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
						init: false,
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
