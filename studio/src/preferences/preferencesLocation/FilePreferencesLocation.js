import {PreferencesLocation} from "./PreferencesLocation.js";

/**
 * @fileoverview A preferences location that stores preferences in the project.
 * This is used for both the "version-control" and "project" locations,
 * with the only difference between the two being the destination of the file.
 */

export class FilePreferencesLocation extends PreferencesLocation {
	#fs;
	#path;
	#preferencesLoaded = false;
	#fileExists = false;
	/** @type {Set<() => void>} */
	#onFileCreatedCbs = new Set();

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
		this.#load(fromUserGesture);
	}

	/**
	 * @param {boolean} fromUserGesture
	 */
	async #load(fromUserGesture) {
		if (!fromUserGesture) {
			await this.#fs.waitForPermission(this.#path, {writable: false});
		}
		const isFile = await this.#fs.isFile(this.#path);
		if (!isFile) {
			this.loadPreferences({});
		} else {
			this.#fileExists = true;
			const preferences = await this.#fs.readJson(this.#path);
			this.loadPreferences(preferences || {});
		}
		this.#preferencesLoaded = true;
	}

	/**
	 * @override
	 */
	async flush() {
		if (!this.#preferencesLoaded) {
			throw new Error(`Assertion failed, tried to flush "${this.locationType}" preferences location before it was loaded.`);
		}
		await this.#fs.writeJson(this.#path, this.getAllPreferences());
		if (!this.#fileExists) {
			this.#fileExists = true;
			this.#onFileCreatedCbs.forEach(cb => cb());
		}
	}

	/**
	 * Registers a callback that is fired when the preferences file is created for the first time.
	 * @param {() => void} cb
	 */
	onFileCreated(cb) {
		this.#onFileCreatedCbs.add(cb);
	}
}
