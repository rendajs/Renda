import { SingleInstancePromise } from "../../../../src/mod.js";
import { PreferencesLocation } from "./PreferencesLocation.js";

/**
 * @fileoverview A preferences location that stores preferences in the project.
 * This is used for both the "version-control" and "project" locations,
 * with the only difference between the two being the destination of the file.
 */

/**
 * @typedef PreferencesFileData
 * @property {Object<string, unknown>} [preferences]
 * @property {import("../../windowManagement/WindowManager.js").ContentWindowPersistentDiskData[]} [contentWindowPreferences]
 */

export class FilePreferencesLocation extends PreferencesLocation {
	#fs;
	#path;
	#loadInstance;
	#preferencesLoaded = false;
	#fileExists = false;
	/** @type {Set<() => void>} */
	#onFileCreatedCbs = new Set();

	/** @type {import("../../windowManagement/WindowManager.js").ContentWindowPersistentDiskData[]} */
	#contentWindowPreferences = [];

	/**
	 * @param {import("./PreferencesLocation.js").PreferenceLocationTypes} locationType
	 * @param {import("../../util/fileSystems/StudioFileSystem.js").StudioFileSystem} fileSystem
	 * @param {import("../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} destinationPath
	 * @param {boolean} fromUserGesture
	 */
	constructor(locationType, fileSystem, destinationPath, fromUserGesture) {
		super(locationType);

		this.#fs = fileSystem;
		this.#path = destinationPath;

		this.#loadInstance = new SingleInstancePromise(async () => {
			if (!fromUserGesture) {
				await this.#fs.waitForPermission(this.#path, { writable: false });
			}
			const isFile = await this.#fs.isFile(this.#path);
			if (!isFile) {
				this.loadPreferences({});
			} else {
				this.#fileExists = true;
				const preferencesData = await this.#fs.readJson(this.#path);
				const castPreferencesData = /** @type {PreferencesFileData} */ (preferencesData);
				this.loadPreferences(castPreferencesData.preferences || {});
				this.#contentWindowPreferences = castPreferencesData.contentWindowPreferences || [];
			}
			this.#preferencesLoaded = true;
		});
		this.#loadInstance.run();
	}

	/**
	 * @override
	 */
	async flush() {
		if (!this.#preferencesLoaded) {
			throw new Error(`Assertion failed, tried to flush "${this.locationType}" preferences location before it was loaded.`);
		}

		/** @type {PreferencesFileData} */
		const preferencesData = {};

		const preferences = this.getAllPreferences();
		if (Object.entries(preferences).length > 0) {
			preferencesData.preferences = preferences;
		}

		if (this.#contentWindowPreferences.length > 0) {
			preferencesData.contentWindowPreferences = this.#contentWindowPreferences;
		}

		await this.#fs.writeJson(this.#path, preferencesData);
		if (!this.#fileExists) {
			this.#fileExists = true;
			this.#onFileCreatedCbs.forEach((cb) => cb());
		}
	}

	/**
	 * Registers a callback that is fired when the preferences file is created for the first time.
	 * @param {() => void} cb
	 */
	onFileCreated(cb) {
		this.#onFileCreatedCbs.add(cb);
	}

	/**
	 * @param {import("../../windowManagement/WindowManager.js").ContentWindowPersistentDiskData[] | null} data
	 */
	async setContentWindowPreferences(data) {
		this.#contentWindowPreferences = data || [];
		await this.flush();
	}

	/**
	 * @returns {Promise<import("../../windowManagement/WindowManager.js").ContentWindowPersistentDiskData[]>}
	 */
	async getContentWindowPreferences() {
		await this.#loadInstance.waitForFinishOnce();
		return this.#contentWindowPreferences;
	}
}
