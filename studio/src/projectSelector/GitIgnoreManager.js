export class GitIgnoreManager {
	/**
	 * @param {import("../util/fileSystems/StudioFileSystem.js").StudioFileSystem} fileSystem
	 * @param {import("../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} ignereFilePath
	 */
	constructor(fileSystem, ignereFilePath = [".gitignore"]) {
		this.fileSystem = fileSystem;
		this.ignereFilePath = ignereFilePath;
	}

	/**
	 * @param {import("../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path
	 */
	async addEntry(path) {
		/** @type {string[]} */
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
