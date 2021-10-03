import toFormattedJsonString from "../toFormattedJsonString.js";

/** @typedef {string[]} EditorFileSystemPath */

/** @typedef {{files: Array<String>, directories: Array<String>}} EditorFileSystemReadDirResult */

export default class EditorFileSystem {
	constructor() {
		this.onExternalChangeCbs = new Set();
		/** @type {Set<function(string):void>} */
		this.onRootNameChangeCbs = new Set();
	}

	/**
	 * Returns true if the user has permission to read (or write if specified) at the specified path.
	 * If the file/directory does not exist, it still returns true when
	 * the highest available directory in the path has permissions.
	 * @param {EditorFileSystemPath} path The path to get permissions for.
	 * @param {Object} opts
	 * @param {Boolean} [opts.writable] Check for writable permissions if true.
	 * @param {Boolean} [opts.prompt] If set to false, this method will not trigger any ui pop ups asking the user for permissions.
	 * @returns {Promise<Boolean>} Whether permissions have been granted or already exist.
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
	async createDir(path = []) {}

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
	async writeFile(path = [], file = null) {}

	/**
	 * @param {EditorFileSystemPath} path
	 * @param {Boolean} keepExistingData
	 * @returns {Promise<FileSystemWritableFileStream>}
	 */
	async writeFileStream(path = [], keepExistingData = false) {
		return null;
	}

	/**
	 * @param {Array<String>} fromPath
	 * @param {Array<String>} toPath
	 */
	async move(fromPath = [], toPath = []) {}

	/**
	 * @param {string} name The new name of the root directory.
	 * @param {boolean} notifyListeners Whether to fire `onRootNameChange` callbacks.
	 */
	async setRootName(name, notifyListeners = true) {
		if (notifyListeners) this.onRootNameChangeCbs.forEach(cb => cb(name));
	}

	async getRootName() {
		return "";
	}

	/**
	 * @param {function(string):void} cb
	 */
	async onRootNameChange(cb) {
		this.onRootNameChangeCbs.add(cb);
	}

	/**
	 * Deletes a file or directory.
	 * Will throw if the path does not exist.
	 * @param {EditorFileSystemPath} path The file or directory to delete.
	 * @param {Boolean} recursive Whether to delete all subdirectories and files.
	 */
	async delete(path = [], recursive = false) {}

	/**
	 * Check if a file exists at the specified path, and if it is a file.
	 * Does not throw when any part of the path doesn't exist.
	 * @param {EditorFileSystemPath} path
	 * @returns {Promise<Boolean>}
	 */
	async isFile(path = []) {
		return false;
	}

	/**
	 * Check if a directory exists at the specified path, and if it is a directory.
	 * Does not throw when any part of the path doesn't exist.
	 * @param {EditorFileSystemPath} path
	 * @returns {Promise<Boolean>}
	 */
	async isDir(path = []) {
		return false;
	}

	/**
	 * @param {EditorFileSystemPath} path
	 * @returns {Promise<Boolean>}
	 */
	async exists(path = []) {
		const isFile = await this.isFile(path);
		const isDir = await this.isDir(path);
		return isFile || isDir;
	}

	onExternalChange(cb) {
		this.onExternalChangeCbs.add(cb);
	}

	fireExternalChange(e) {
		for (const cb of this.onExternalChangeCbs) {
			cb(e);
		}
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
	 * @param {String} text
	 * @param {Object} opts
	 * @param {String} [opts.type]
	 */
	async writeText(path = [], text = "", {
		type = "text/plain",
	} = {}) {
		await this.writeFile(path, new File([text], "", {type}));
	}

	/**
	 * @param {EditorFileSystemPath} path
	 * @returns {Promise<String>}
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
