import toFormattedJsonString from "../toFormattedJsonString.js";

/** @typedef {string[]} EditorFileSystemPath */

/** @typedef {{files: Array<string>, directories: Array<string>}} EditorFileSystemReadDirResult */

/**
 * @typedef {Object} FileSystemExternalChangeEvent
 * @property {"file" | "directory"} kind
 * @property {string[]} path
 * @property {"changed" | "created" | "deleted"} type
 */

export default class EditorFileSystem {
	constructor() {
		this.onExternalChangeCbs = new Set();
		this.onAnyChangeCbs = new Set();
		/** @type {Set<function(string):void>} */
		this.onRootNameChangeCbs = new Set();
	}

	/**
	 * Returns true if the user has permission to read (or write if specified) at the specified path.
	 * If the file/directory does not exist, it still returns true when
	 * the highest available directory in the path has permissions.
	 * @param {EditorFileSystemPath} path The path to get permissions for.
	 * @param {Object} opts
	 * @param {boolean} [opts.writable] Check for writable permissions if true.
	 * @param {boolean} [opts.prompt] If set to false, this method will not trigger any ui pop ups asking the user for permissions.
	 * @returns {Promise<boolean>} Whether permissions have been granted or already exist.
	 */
	async getPermission(path = [], {
		writable = true,
		prompt = false,
	} = {}) {
		return true;
	}

	/**
	 * @param {EditorFileSystemPath} path
	 * @returns {Promise<EditorFileSystemReadDirResult>}
	 */
	async readDir(path = []) {
		return {
			files: [], // DOMString array of file names
			directories: [], // DOMString array of directory names
		};
	}

	/**
	 * @param {EditorFileSystemPath} path
	 * @returns {Promise<void>}
	 */
	async createDir(path = []) {
		this.fireOnBeforeAnyChange();
	}

	/**
	 * @param {EditorFileSystemPath} path
	 * @returns {Promise<File>}
	 */
	async readFile(path = []) {
		return new File([], "");
	}

	/**
	 * Writes file to the system, overwrites file if it already exists.
	 * Use {@link EditorFileSystem.writeText} for writing strings.
	 * Use {@link EditorFileSystem.writeJson} for writing json Objects.
	 * @param {EditorFileSystemPath} path
	 * @param {File | BufferSource | Blob | string} file
	 */
	async writeFile(path = [], file = null) {
		this.fireOnBeforeAnyChange();
	}

	/**
	 * @param {EditorFileSystemPath} path
	 * @param {boolean} keepExistingData
	 * @returns {Promise<FileSystemWritableFileStream>}
	 */
	async writeFileStream(path = [], keepExistingData = false) {
		this.fireOnBeforeAnyChange();
		return null;
	}

	/**
	 * @param {Array<string>} fromPath
	 * @param {Array<string>} toPath
	 */
	async move(fromPath = [], toPath = []) {}

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
	async delete(path = [], recursive = false) {
		this.fireOnBeforeAnyChange();
	}

	/**
	 * Check if a file exists at the specified path, and if it is a file.
	 * Does not throw when any part of the path doesn't exist.
	 * @param {EditorFileSystemPath} path
	 * @returns {Promise<boolean>}
	 */
	async isFile(path = []) {
		return false;
	}

	/**
	 * Check if a directory exists at the specified path, and if it is a directory.
	 * Does not throw when any part of the path doesn't exist.
	 * @param {EditorFileSystemPath} path
	 * @returns {Promise<boolean>}
	 */
	async isDir(path = []) {
		return false;
	}

	/**
	 * @param {EditorFileSystemPath} path
	 * @returns {Promise<boolean>}
	 */
	async exists(path = []) {
		const isFile = await this.isFile(path);
		const isDir = await this.isDir(path);
		return isFile || isDir;
	}

	/**
	 * Fires when a file is changed from outside the application.
	 * @param {Function} cb
	 */
	onExternalChange(cb) {
		this.onExternalChangeCbs.add(cb);
	}

	/**
	 * @param {Function} cb
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
	 * @param {Function} cb
	 */
	onBeforeAnyChange(cb) {
		this.onAnyChangeCbs.add(cb);
	}

	/**
	 * @param {Function} cb
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
	 * @param {Object} opts
	 * @param {string} [opts.type]
	 */
	async writeText(path = [], text = "", {
		type = "text/plain",
	} = {}) {
		await this.writeFile(path, new File([text], "", {type}));
	}

	/**
	 * @param {EditorFileSystemPath} path
	 * @returns {Promise<string>}
	 */
	async readText(path = []) {
		const file = await this.readFile(path);
		return await file.text();
	}

	async writeJson(path = [], json = {}) {
		const jsonStr = toFormattedJsonString(json);
		await this.writeText(path, jsonStr, {type: "application/json"});
	}

	/**
	 * @param {EditorFileSystemPath} path
	 * @returns {Promise<?Object>}
	 */
	async readJson(path = []) {
		const file = await this.readFile(path);
		if (file.type == "application/json") {
			const body = await file.text();
			const json = JSON.parse(body);
			return json;
		}
		return null;
	}

	/**
	 * @param {EditorFileSystemPath} path
	 * @param {BlobPart} binary File, Blob, ArrayBuffer or TypedArray.
	 */
	async writeBinary(path = [], binary = null) {
		const fileName = path[path.length - 1] || "";
		await this.writeFile(path, new File([binary], fileName));
	}
}
