export class GitIgnoreManager {
	/**
	 * @param {import("../Util/FileSystems/EditorFileSystem.js").EditorFileSystem} fileSystem
	 * @param {import("../Util/FileSystems/EditorFileSystem.js").EditorFileSystemPath} ignereFilePath
	 */
	constructor(fileSystem, ignereFilePath = [".gitignore"]) {
		this.fileSystem = fileSystem;
		this.ignereFilePath = ignereFilePath;
	}

	/**
	 * @param {import("../Util/FileSystems/EditorFileSystem.js").EditorFileSystemPath} path
	 */
	async addEntry(path) {
		let lines = [];
		if (await this.fileSystem.isFile(this.ignereFilePath)) {
			const currentIgnore = await this.fileSystem.readText(this.ignereFilePath);
			lines = currentIgnore.split("\n");
		}
		const pathStr = path.join("/");
		lines.push(pathStr);
		const newIgnore = lines.join("\n");
		await this.fileSystem.writeText(this.ignereFilePath, newIgnore);
	}
}
