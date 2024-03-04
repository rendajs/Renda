import { StudioFileSystem } from "./StudioFileSystem.js";
import { MemoryFileSystemWritableFileStream } from "./MemoryFileSystemWritableFileStream.js";

/** @typedef {MemoryStudioFileSystemFilePointer | MemoryStudioFileSystemDirPointer} MemoryStudioFileSystemPointer */
/**
 * @typedef MemoryStudioFileSystemFilePointer
 * @property {true} isFile
 * @property {string} name
 * @property {File} file
 */
/**
 * @typedef MemoryStudioFileSystemDirPointer
 * @property {false} isFile
 * @property {string} name
 * @property {MemoryStudioFileSystemPointer[]} children
 */

/**
 * A StudioFileSystem that is stored in memory only. Restarting the application will clear all file data.
 * This is mostly useful for mocking in unit tests, but can also be used as
 * a fallback in case any other file system types are not supported on a platform.
 */
export class MemoryStudioFileSystem extends StudioFileSystem {
	constructor() {
		super();

		/** @type {MemoryStudioFileSystemDirPointer} */
		this.rootObject = {
			isFile: false,
			name: "root",
			children: [],
		};
	}

	/**
	 * @typedef {"type-mismatch" | "not-found"} GetObjectPointerErrorType
	 */

	/**
	 * @private
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 * @param {object} options
	 * @param {boolean} [options.create]
	 * @param {"file" | "dir"} [options.createType]
	 * @param {string} [options.errorMessageActionName]
	 */
	getObjectPointer(path, {
		create = false,
		createType = "dir",
		errorMessageActionName = "get object",
	} = {}) {
		/** @type {MemoryStudioFileSystemPointer} */
		let currentObject = this.rootObject;
		let created = false;
		for (const [i, name] of path.entries()) {
			/**
			 * @param {GetObjectPointerErrorType} type
			 * @returns {never}
			 */
			function throwError(type, failurePathOffset = 0) {
				const pathStr = path.join("/");
				const failurePathStr = path.slice(0, i + failurePathOffset).join("/");
				let ending = ".";
				if (type == "not-found") {
					ending = `, "${failurePathStr}" does not exist.`;
				} else if (type == "type-mismatch") {
					ending = `, "${failurePathStr}" is not a directory.`;
				}
				const atText = pathStr == failurePathStr ? "" : ` "${pathStr}"`;
				throw new Error(`Failed to ${errorMessageActionName}${atText}${ending}`);
			}
			if (currentObject.isFile) {
				throwError("type-mismatch");
			}
			/** @type {MemoryStudioFileSystemPointer[]} */
			const children = currentObject.children;
			let child = children.find((c) => c.name == name);
			if (!child) {
				if (!create) {
					throwError("not-found", 1);
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
				this.fireChange({
					external: false,
					kind: child.isFile ? "file" : "directory",
					path: path.slice(0, i + 1),
					type: "created",
				});
				children.push(child);
				created = true;
			}
			currentObject = child;
		}
		return {
			pointer: currentObject,
			created,
		};
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 * @returns {Promise<import("./StudioFileSystem.js").StudioFileSystemReadDirResult>}
	 */
	async readDir(path) {
		const files = [];
		const directories = [];
		const { pointer } = this.getObjectPointer(path, {
			errorMessageActionName: "read",
		});
		if (pointer.isFile) {
			const pathStr = path.join("/");
			throw new Error(`Failed to read, "${pathStr}" is not a directory.`);
		}
		for (const child of pointer.children) {
			if (child.isFile) {
				files.push(child.name);
			} else {
				directories.push(child.name);
			}
		}
		return { files, directories };
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 */
	async createDir(path) {
		path = [...path];
		this.getObjectPointer(path, {
			create: true,
			createType: "dir",
			errorMessageActionName: "createDir",
		});
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} fromPath
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} toPath
	 */
	async move(fromPath = [], toPath = []) {
		/** @returns {never} */
		function notFoundError() {
			throw new Error(`Failed to move: The file or directory at "${fromPath.join("/")}" does not exist.`);
		}

		const oldParentPath = fromPath.slice(0, -1);
		const newParentPath = toPath.slice(0, -1);

		const oldBasename = fromPath.at(-1);
		if (!oldBasename) notFoundError();
		const newBasename = toPath.at(-1);
		if (!newBasename) {
			throw new Error("Assertion failed, newBasename doesn't exist.");
		}

		const { pointer: oldParentPointer } = this.getObjectPointer(oldParentPath, {
			errorMessageActionName: "delete",
		});
		if (oldParentPointer.isFile) notFoundError();
		const index = oldParentPointer.children.findIndex((child) => child.name == oldBasename);
		if (index == -1) notFoundError();
		const movingPointer = oldParentPointer.children[index];

		let existingPointer;
		try {
			existingPointer = this.getObjectPointer(toPath);
		} catch {
			// If there is no existing pointer yet, we can continue with the move
		}
		if (existingPointer) {
			if (existingPointer.pointer.isFile) {
				throw new Error(`Failed to move: "${toPath.join("/")}" is a file.`);
			} else if (existingPointer.pointer.children.length > 0) {
				throw new Error(`Failed to move: "${toPath.join("/")}" is a non-empty directory.`);
			}
		}

		const { pointer: newParentPointer } = this.getObjectPointer(newParentPath, {
			create: true,
			createType: movingPointer.isFile ? "file" : "dir",
		});
		if (newParentPointer.isFile) {
			throw new Error("Assertion failed, destination parent is a file.");
		}
		/** @type {MemoryStudioFileSystemPointer} */
		let movingPointerClone;
		if (movingPointer.isFile) {
			movingPointerClone = {
				isFile: true,
				file: movingPointer.file,
				name: newBasename,
			};
		} else {
			movingPointerClone = {
				isFile: false,
				name: newBasename,
				children: movingPointer.children,
			};
		}

		// If the destination already exists, we need to overwrite it,
		// so we remove the existing entry
		const existingIndex = newParentPointer.children.findIndex((child) => child.name == newBasename);
		if (existingIndex >= 0) {
			newParentPointer.children.splice(existingIndex, 1);
		}

		newParentPointer.children.push(movingPointerClone);
		this.fireChange({
			external: false,
			kind: "file",
			path: toPath,
			type: "created",
		});

		oldParentPointer.children.splice(index, 1);
		this.fireChange({
			external: false,
			kind: "unknown",
			path: fromPath,
			type: "deleted",
		});
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 * @returns {Promise<File>}
	 */
	async readFile(path) {
		const { pointer } = this.getObjectPointer(path, {
			errorMessageActionName: "read",
		});
		if (!pointer.isFile) {
			throw new Error(`Failed to read, "${path.join("/")}" is not a file.`);
		}
		return pointer.file;
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 * @param {import("./StudioFileSystem.js").AllowedWriteFileTypes} file
	 */
	async writeFile(path, file) {
		path = [...path];
		const { pointer, created } = this.getObjectPointer(path, {
			create: true,
			createType: "file",
			errorMessageActionName: "write",
		});
		if (!pointer.isFile) {
			const pathStr = path.join("/");
			throw new Error(`Failed to write, "${pathStr}" is not a file.`);
		}
		pointer.file = new File([file], pointer.name);

		if (!created) {
			this.fireChange({
				external: false,
				kind: "file",
				path,
				type: "changed",
			});
		}
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 * @param {boolean} keepExistingData
	 * @returns {Promise<FileSystemWritableFileStream>}
	 */
	async writeFileStream(path, keepExistingData = false) {
		const { pointer } = this.getObjectPointer(path, {
			create: true,
			createType: "file",
			errorMessageActionName: "write",
		});
		if (!pointer.isFile) {
			const pathStr = path.join("/");
			throw new Error(`Failed to write, "${pathStr}" is not a file.`);
		}
		if (!keepExistingData) {
			pointer.file = new File([], pointer.name);
		}
		return new MemoryFileSystemWritableFileStream(pointer);
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path The file or directory to delete.
	 * @param {boolean} recursive Whether to delete all subdirectories and files.
	 */
	async delete(path, recursive = false) {
		path = [...path];

		/** @returns {never} */
		function notFoundError() {
			throw new Error(`Failed to delete "${path.join("/")}" because it does not exist.`);
		}

		if (!recursive) {
			const { pointer } = this.getObjectPointer(path, {
				errorMessageActionName: "delete",
			});
			if (!pointer.isFile) {
				throw new Error(`Failed to delete "${path.join("/")}" because it is a non-empty directory. Use recursive = true to delete non-empty directories.`);
			}
		}

		const parentPath = path.slice(0, -1);
		const basename = path.at(-1);
		if (!basename) notFoundError();
		const { pointer: parentPointer } = this.getObjectPointer(parentPath, {
			errorMessageActionName: "delete",
		});
		if (parentPointer.isFile) notFoundError();
		const index = parentPointer.children.findIndex((child) => child.name == basename);
		if (index == -1) notFoundError();
		parentPointer.children.splice(index, 1);

		this.fireChange({
			external: false,
			kind: "unknown",
			path,
			type: "deleted",
		});
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 * @returns {Promise<boolean>}
	 */
	async isFile(path) {
		try {
			const { pointer } = this.getObjectPointer(path);
			return pointer.isFile;
		} catch {
			return false;
		}
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 * @returns {Promise<boolean>}
	 */
	async isDir(path) {
		try {
			const { pointer } = this.getObjectPointer(path);
			return !pointer.isFile;
		} catch {
			return false;
		}
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
	 * @param {Object<string, import("./StudioFileSystem.js").AllowedWriteFileTypes>} structure
	 */
	async setFullStructure(structure) {
		this.rootObject = {
			isFile: false,
			name: "",
			children: [],
		};
		for (const [path, file] of Object.entries(structure)) {
			const { pointer } = this.getObjectPointer(path.split("/"), {
				create: true,
				createType: "file",
			});
			if (!pointer.isFile) {
				throw new Error("Assertion error, object is not a file");
			}
			pointer.file = new File([file], pointer.name);
		}
	}
}
