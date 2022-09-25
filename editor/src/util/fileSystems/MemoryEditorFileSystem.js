import {EditorFileSystem} from "./EditorFileSystem.js";
import {MemoryFileSystemWritableFileStream} from "./MemoryFileSystemWritableFileStream.js";

/** @typedef {MemoryEditorFileSystemFilePointer | MemoryEditorFileSystemDirPointer} MemoryEditorFileSystemPointer */
/**
 * @typedef MemoryEditorFileSystemFilePointer
 * @property {true} isFile
 * @property {string} name
 * @property {File} file
 */
/**
 * @typedef MemoryEditorFileSystemDirPointer
 * @property {false} isFile
 * @property {string} name
 * @property {MemoryEditorFileSystemPointer[]} children
 */

/**
 * An EditorFileSystem that is stored in memory only. Restarting the application will clear all file data.
 * This is mostly useful for mocking in unit tests, but can also be used as
 * a fallback in case any other file system types are not supported on a platform.
 */
export class MemoryEditorFileSystem extends EditorFileSystem {
	constructor() {
		super();

		/** @type {MemoryEditorFileSystemDirPointer} */
		this.rootObject = {
			isFile: false,
			name: "root",
			children: [],
		};
	}

	/**
	 * @private
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 * @param {object} options
	 * @param {boolean} [options.create]
	 * @param {"file" | "dir"} [options.createType]
	 */
	getObjectPointer(path, {
		create = false,
		createType = "dir",
	} = {}) {
		/** @type {MemoryEditorFileSystemPointer} */
		let currentObject = this.rootObject;
		for (const [i, name] of path.entries()) {
			if (currentObject.isFile) {
				throw new Error(`Couldn't get object at ${path.join("/")} because ${name} is a file.`);
			}
			/** @type {MemoryEditorFileSystemPointer[]} */
			const children = currentObject.children;
			let child = children.find(c => c.name == name);
			if (!child) {
				if (!create) {
					throw new Error(`${path.join("/")} not found, ${name} does not exist.`);
				}
				if (createType == "file" && i == path.length - 1) {
					child = {
						isFile: true,
						name,
						file: new File([], name),
					};
				} else {
					child = {
						isFile: false,
						name,
						children: [],
					};
				}
				children.push(child);
			}
			currentObject = child;
		}
		return currentObject;
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 * @returns {Promise<import("./EditorFileSystem.js").EditorFileSystemReadDirResult>}
	 */
	async readDir(path) {
		const files = [];
		const directories = [];
		const object = this.getObjectPointer(path);
		if (object.isFile) {
			throw new Error(`Cannot readDir: ${path.join("/")} is a file.`);
		}
		for (const child of object.children) {
			if (child.isFile) {
				files.push(child.name);
			} else {
				directories.push(child.name);
			}
		}
		return {files, directories};
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 */
	async createDir(path) {
		const pathCopy = [...path];
		this.getObjectPointer(pathCopy, {
			create: true,
			createType: "dir",
		});

		this.fireChange({
			external: false,
			kind: "directory",
			path: pathCopy,
			type: "created",
		});
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 * @returns {Promise<File>}
	 */
	async readFile(path) {
		const object = this.getObjectPointer(path);
		if (!object.isFile) {
			throw new Error(`"${path.join("/")}" is not a file.`);
		}
		return object.file;
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 * @param {import("./EditorFileSystem.js").AllowedWriteFileTypes} file
	 */
	async writeFile(path, file) {
		const object = this.getObjectPointer(path, {
			create: true,
			createType: "file",
		});
		if (!object.isFile) {
			throw new Error(`"${path.join("/")}" is not a file.`);
		}
		object.file = new File([file], object.name);
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 * @param {boolean} keepExistingData
	 * @returns {Promise<FileSystemWritableFileStream>}
	 */
	async writeFileStream(path, keepExistingData = false) {
		const object = this.getObjectPointer(path, {
			create: true,
			createType: "file",
		});
		if (!object.isFile) {
			throw new Error(`"${path.join("/")}" is not a file.`);
		}
		if (!keepExistingData) {
			object.file = new File([], object.name);
		}
		return new MemoryFileSystemWritableFileStream(object);
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 * @returns {Promise<boolean>}
	 */
	async isFile(path) {
		let object = null;
		try {
			object = this.getObjectPointer(path);
		} catch {
			return false;
		}
		return object.isFile;
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 * @returns {Promise<boolean>}
	 */
	async isDir(path) {
		let object = null;
		try {
			object = this.getObjectPointer(path);
		} catch {
			return false;
		}
		return !object.isFile;
	}

	/**
	 * Clears all files and replaces the full folder structure.
	 * Takes an object with keys as paths and values as files to write.
	 * This is mostly useful for setting up a quick test environment.
	 *
	 * ### Usage
	 * ```js
	 * fs.setFullStructure({
	 *   "file1.txt": new File([], "file1.txt"),
	 *   "folder/file2.txt": "Plain text file content",
	 *   "folder/file3.txt": new Blob(...),
	 *   "folder/subfolder/file3.txt": new ArrayBuffer(...),
	 * });
	 * ```
	 * })
	 * @param {Object<string, import("./EditorFileSystem.js").AllowedWriteFileTypes>} structure
	 */
	async setFullStructure(structure) {
		this.rootObject = {
			isFile: false,
			name: "",
			children: [],
		};
		for (const [path, file] of Object.entries(structure)) {
			const object = this.getObjectPointer(path.split("/"), {
				create: true,
				createType: "file",
			});
			if (!object.isFile) {
				throw new Error("Assertion error, object is not a file");
			}
			object.file = new File([file], object.name);
		}
	}
}
