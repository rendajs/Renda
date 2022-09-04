import {toFormattedJsonString} from "../../../../src/util/toFormattedJsonString.js";
import {WriteOperation} from "./WriteOperation.js";

/** @typedef {string[]} EditorFileSystemPath */

/** @typedef {File | BufferSource | Blob | string} AllowedWriteFileTypes */

/** @typedef {{files: Array<string>, directories: Array<string>}} EditorFileSystemReadDirResult */

/**
 * @typedef {object} FileSystemExternalChangeEvent
 * @property {"file" | "directory"} kind
 * @property {string[]} path
 * @property {"changed" | "created" | "deleted"} type
 */

/** @typedef {(e: FileSystemExternalChangeEvent) => any} FileSystemExternalChangeCallback */

/**
 * @abstract
 */
export class EditorFileSystem {
	constructor() {
		/** @type {Set<FileSystemExternalChangeCallback>} */
		this.onExternalChangeCbs = new Set();
		/** @type {Set<() => void>} */
		this.onAnyChangeCbs = new Set();
		/** @type {Set<function(string):void>} */
		this.onRootNameChangeCbs = new Set();
		/** @private @type {Set<WriteOperation>} */
		this.writeOperations = new Set();
		/** @private @type {Set<() => void>} */
		this.onWriteOperationFinishCbs = new Set();
	}

	/**
	 * Any calls to a file system might show a permission prompt if the relevant
	 * files don't have granted permission yet. These prompts require a user
	 * gesture, therefore you should always call this method to check if permission
	 * has been granted when calling without a user gesture. When you do so make sure
	 * `prompt` is false.
	 * Additionaly you can also call this in advance from a user gesture with
	 * `prompt` set to true.
	 * @param {EditorFileSystemPath} path The path to get permissions for.
	 * @param {object} opts
	 * @param {boolean} [opts.writable] Check for writable permissions if true.
	 * @param {boolean} [opts.prompt] If set to false, this method will not trigger any ui pop ups asking the user for permissions.
	 * @returns {Promise<boolean>} True permissions have been granted or already exist.
	 * If the file/directory does not exist, true is still returned when
	 * the highest available directory in the path has granted permissions.
	 */
	async getPermission(path, {
		writable = true,
		prompt = false,
	} = {}) {
		return true;
	}

	/**
	 * Resolves once permission has been granted. Note that you still need to call
	 * {@link EditorFileSystem.getPermission} or any other method that requires
	 * permission in order to trigger the permission prompt.
	 * This is useful in a scenario where you want to access a file but the running
	 * code is not triggered by a user gesture.
	 * @param {EditorFileSystemPath} path The path to get permissions for.
	 * @param {object} opts
	 * @param {boolean} [opts.writable] Check for writable permissions if true.
	 */
	async waitForPermission(path, {
		writable = true,
	} = {}) {
	}

	/**
	 * @param {EditorFileSystemPath} path
	 * @returns {Promise<EditorFileSystemReadDirResult>}
	 */
	async readDir(path) {
		return {
			files: [],
			directories: [],
		};
	}

	/**
	 * @param {EditorFileSystemPath} path
	 * @returns {Promise<void>}
	 */
	async createDir(path) {
		this.fireOnBeforeAnyChange();
	}

	/**
	 * @param {EditorFileSystemPath} path
	 * @returns {Promise<File>}
	 */
	async readFile(path) {
		return new File([], "");
	}

	/**
	 * Writes file to the system, overwrites file if it already exists.
	 * Use {@link EditorFileSystem.writeText} for writing strings.
	 * Use {@link EditorFileSystem.writeJson} for writing json Objects.
	 * @param {EditorFileSystemPath} path
	 * @param {AllowedWriteFileTypes} file
	 */
	async writeFile(path, file) {
		this.fireOnBeforeAnyChange();
	}

	/**
	 * @abstract
	 * @param {EditorFileSystemPath} path
	 * @param {boolean} keepExistingData
	 * @returns {Promise<FileSystemWritableFileStream>}
	 */
	async writeFileStream(path, keepExistingData = false) {
		throw new Error("writeFileStream is not implemented for this file system type.");
	}

	/**
	 * To be used internally by the file system.
	 * Returns an WriteOperation object that can be used to let the file system
	 * know when the operation is finished.
	 * This is used for resolving {@linkcode waitForWritesFinish}.
	 */
	requestWriteOperation() {
		const op = new WriteOperation();
		this.writeOperations.add(op);
		op.onDone(() => {
			this.writeOperations.delete(op);
			if (this.writeOperations.size <= 0) {
				this.onWriteOperationFinishCbs.forEach(cb => cb());
				this.onWriteOperationFinishCbs.clear();
			}
		});
		return op;
	}

	/**
	 * Resolves once all files are known to be written. At this point, reloading
	 * the page should not cause any data loss.
	 */
	async waitForWritesFinish() {
		if (this.writeOperations.size <= 0) return;

		/** @type {Promise<void>} */
		const promise = new Promise(r => {
			this.onWriteOperationFinishCbs.add(r);
		});
		await promise;
	}

	/**
	 * @param {EditorFileSystemPath} fromPath
	 * @param {EditorFileSystemPath} toPath
	 */
	async move(fromPath, toPath) {
		this.fireOnBeforeAnyChange();
	}

	rootNameSetSupported = false;

	/**
	 * @param {string} name The new name of the root directory.
	 */
	async setRootName(name) {
		this.onRootNameChangeCbs.forEach(cb => cb(name));
		this.fireOnBeforeAnyChange();
	}

	async getRootName() {
		return "";
	}

	/**
	 * @param {function(string):void} cb
	 */
	onRootNameChange(cb) {
		this.onRootNameChangeCbs.add(cb);
	}

	/**
	 * @param {function(string):void} cb
	 */
	removeOnRootNameChange(cb) {
		this.onRootNameChangeCbs.delete(cb);
	}

	/**
	 * Deletes a file or directory.
	 * Will throw if the path does not exist.
	 * @param {EditorFileSystemPath} path The file or directory to delete.
	 * @param {boolean} recursive Whether to delete all subdirectories and files.
	 */
	async delete(path, recursive = false) {
		this.fireOnBeforeAnyChange();
	}

	/**
	 * Check if a file exists at the specified path, and if it is a file.
	 * Does not throw when any part of the path doesn't exist.
	 * @param {EditorFileSystemPath} path
	 * @returns {Promise<boolean>}
	 */
	async isFile(path) {
		return false;
	}

	/**
	 * Check if a directory exists at the specified path, and if it is a directory.
	 * Does not throw when any part of the path doesn't exist.
	 * @param {EditorFileSystemPath} path
	 * @returns {Promise<boolean>}
	 */
	async isDir(path) {
		return false;
	}

	/**
	 * @param {EditorFileSystemPath} path
	 * @returns {Promise<boolean>}
	 */
	async exists(path) {
		const isFile = await this.isFile(path);
		const isDir = await this.isDir(path);
		return isFile || isDir;
	}

	/**
	 * Fires when a file is changed from outside the application.
	 * @param {FileSystemExternalChangeCallback} cb
	 */
	onExternalChange(cb) {
		this.onExternalChangeCbs.add(cb);
	}

	/**
	 * @param {FileSystemExternalChangeCallback} cb
	 */
	removeOnExternalChange(cb) {
		this.onExternalChangeCbs.delete(cb);
	}

	/**
	 * @param {FileSystemExternalChangeEvent} e
	 */
	fireExternalChange(e) {
		this.onExternalChangeCbs.forEach(cb => cb(e));
	}

	/**
	 * Fires when a file is changed either by the application or externally.
	 * @param {() => void} cb
	 */
	onBeforeAnyChange(cb) {
		this.onAnyChangeCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	removeOnBeforeAnyChange(cb) {
		this.onAnyChangeCbs.delete(cb);
	}

	fireOnBeforeAnyChange() {
		this.onAnyChangeCbs.forEach(cb => cb());
	}

	/**
	 * External change events are not guaranteed to fire immediately.
	 * Calling this method suggests that right now is a good time
	 * to check for external changes.
	 */
	suggestCheckExternalChanges() {}

	/* ==== util functions ==== */

	/**
	 * @param {EditorFileSystemPath} path
	 * @param {string} text
	 * @param {object} opts
	 * @param {string} [opts.type]
	 */
	async writeText(path, text, {
		type = "text/plain",
	} = {}) {
		await this.writeFile(path, new File([text], "", {type}));
	}

	/**
	 * @param {EditorFileSystemPath} path
	 * @returns {Promise<string>}
	 */
	async readText(path) {
		const file = await this.readFile(path);
		return await file.text();
	}

	/**
	 * @param {EditorFileSystemPath} path
	 * @param {any} json
	 */
	async writeJson(path, json) {
		const jsonStr = toFormattedJsonString(json);
		await this.writeText(path, jsonStr, {type: "application/json"});
	}

	/**
	 * @param {EditorFileSystemPath} path
	 * @returns {Promise<?object>}
	 */
	async readJson(path) {
		const file = await this.readFile(path);
		const body = await file.text();
		const json = JSON.parse(body);
		return json;
	}
}
