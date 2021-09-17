import SingleInstancePromise from "../../../src/Util/SingleInstancePromise.js";

export default class ProjectSettingsManager {
	/**
	 * @param {import("../Util/FileSystems/EditorFileSystem.js").default} fileSystem
	 * @param {import("../Util/FileSystems/EditorFileSystem.js").EditorFileSystemPath} filePath
	 */
	constructor(fileSystem, filePath) {
		this.fileSystem = fileSystem;
		this.filePath = filePath;

		this.currentSettings = new Map();

		this.onFileCreatedCbs = new Set();

		this.loadInstance = new SingleInstancePromise(async () => this.load(), {run: true});
	}

	/**
	 * @param {string} key
	 * @param {*} value
	 */
	async set(key, value) {
		this.currentSettings.set(key, value);
		await this.save();
	}

	/**
	 * @param {string} key
	 * @returns {Promise<*>}
	 */
	async get(key) {
		await this.loadInstance.waitForFinish();
		return this.currentSettings.get(key);
	}

	async save() {
		const settingsObject = {};
		for (const [key, value] of this.currentSettings) {
			settingsObject[key] = value;
		}
		const exists = await this.fileSystem.isFile(this.filePath);
		await this.fileSystem.writeJson(this.filePath, settingsObject);
		if (!exists) {
			this.onFileCreatedCbs.forEach(cb => cb());
		}
	}

	async load() {
		const isFile = await this.fileSystem.isFile(this.filePath);
		if (!isFile) return;

		const settingsObject = await this.fileSystem.readJson(this.filePath);
		for (const [key, value] of Object.entries(settingsObject)) {
			this.currentSettings.set(key, value);
		}
	}

	/**
	 * @param {function():void} cb
	 */
	onFileCreated(cb) {
		this.onFileCreatedCbs.add(cb);
	}
}
