/**
 * @param {import("../../../util/fileSystems/StudioFileSystem.js").StudioFileSystem} fileSystem
 */
export function createFileSystemHandlers(fileSystem) {
	return {
		/**
		 * @param {import("../../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path
		 */
		"fileSystem.readDir": async path => {
			return await fileSystem.readDir(path);
		},
		/**
		 * @param {import("../../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path
		 */
		"fileSystem.createDir": async path => {
			return await fileSystem.createDir(path);
		},
		/**
		 * @param {import("../../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path
		 */
		"fileSystem.readFile": async path => {
			return await fileSystem.readFile(path);
		},
		/**
		 * @param {import("../../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path
		 * @param {import("../../../util/fileSystems/StudioFileSystem.js").AllowedWriteFileTypes} file
		 */
		"fileSystem.writeFile": async (path, file) => {
			return await fileSystem.writeFile(path, file);
		},
		/**
		 * @param {import("../../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path
		 */
		"fileSystem.isFile": async path => {
			return await fileSystem.isFile(path);
		},
		/**
		 * @param {import("../../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path
		 */
		"fileSystem.isDir": async path => {
			return await fileSystem.isDir(path);
		},
		/**
		 * @param {import("../../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path
		 */
		"fileSystem.exists": async path => {
			return await fileSystem.exists(path);
		},
	};
}
