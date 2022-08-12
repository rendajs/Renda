import {SingleInstancePromise} from "../../../src/util/SingleInstancePromise.js";

export class ProjectSettingsManager {
	/**
	 * @param {import("../util/fileSystems/EditorFileSystem.js").EditorFileSystem} fileSystem
	 * @param {import("../util/fileSystems/EditorFileSystem.js").EditorFileSystemPath} filePath
	 * @param {boolean} fromUserGesture
	 */
	constructor(fileSystem, filePath, fromUserGesture = false) {
		this.fileSystem = fileSystem;
		this.filePath = filePath;

		/** @type {Map<string, any>} */
		this.currentSettings = new Map();

		/** @type {Set<() => void>} */
		this.onFileCreatedCbs = new Set();

		this.isLoadingFromUserGesture = false;
		this.loadInstance = new SingleInstancePromise(async () => await this.loadFn());
		this.load(fromUserGesture);
	}

	/**
	 * @param {string} key
	 * @param {any} value
	 */
	async set(key, value) {
		await this.loadInstance.waitForFinish();
		if (this.currentSettings.has(key)) {
			const currentValue = this.currentSettings.get(key);
			if (currentValue === value) return;
		}
		this.currentSettings.set(key, value);
		await this.save();
	}

	/**
	 * @param {string} key
	 */
	async delete(key) {
		await this.loadInstance.waitForFinish();
		if (!this.currentSettings.has(key)) return;
		this.currentSettings.delete(key);
		await this.save();
	}

	/**
	 * @param {string} key
	 * @param {*} defaultValue
	 * @returns {Promise<*>}
	 */
	async get(key, defaultValue = null) {
		await this.loadInstance.waitForFinish();
		if (!this.currentSettings.has(key)) return defaultValue;
		return this.currentSettings.get(key);
	}

	async save() {
		/** @type {Object.<string, any>} */
		const settingsObject = {};
		let hasAny = false;
		for (const [key, value] of this.currentSettings) {
			settingsObject[key] = value;
			hasAny = true;
		}
		const exists = await this.fileSystem.isFile(this.filePath);
		if (hasAny) {
			await this.fileSystem.writeJson(this.filePath, settingsObject);
			if (!exists) {
				this.onFileCreatedCbs.forEach(cb => cb());
			}
		} else if (exists) {
			await this.fileSystem.delete(this.filePath);
		}
	}

	async load(fromUserGesture = false) {
		this.isLoadingFromUserGesture = fromUserGesture;
		this.loadInstance.run();
	}

	async loadFn() {
		if (!this.isLoadingFromUserGesture) {
			await this.fileSystem.waitForPermission(this.filePath, {writable: false});
		}
		const isFile = await this.fileSystem.isFile(this.filePath);
		if (!isFile) return;

		/** @type {Object.<string, any>?} */
		const settingsObject = await this.fileSystem.readJson(this.filePath);
		if (!settingsObject) return;
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
