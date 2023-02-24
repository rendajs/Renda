/** @typedef {"global" | "workspace" | "version-control" | "project" | "workspace" | "contentwindow-workspace" | "contentwindow-project"} PreferenceLocationTypes */
/** @typedef {(key: string) => void} OnPreferenceLoadCallback */

export class PreferencesLocation {
	/** @type {Map<string, unknown>} */
	#storedPreferences = new Map();

	/** @type {Set<OnPreferenceLoadCallback>} */
	#onPreferenceLoadedCbs = new Set();

	/**
	 * @param {PreferenceLocationTypes} locationType
	 */
	constructor(locationType) {
		this.locationType = locationType;
	}

	/**
	 * Clears existing values and loads the provided preferences.
	 * Notifies the PreferencesManager that preferences have been changed.
	 * @param {Object<string, unknown>} preferences
	 */
	loadPreferences(preferences) {
		const removedPreferences = new Set(this.#storedPreferences.keys());
		for (const [preference, value] of Object.entries(preferences)) {
			removedPreferences.delete(preference);
			const previousValue = this.#storedPreferences.get(preference);
			if (value != previousValue) {
				this.#storedPreferences.set(preference, value);
				this.#onPreferenceLoadedCbs.forEach(cb => cb(preference));
			}
		}
		for (const preference of removedPreferences) {
			this.#storedPreferences.delete(preference);
			this.#onPreferenceLoadedCbs.forEach(cb => cb(preference));
		}
	}

	/**
	 * Gets an object containing all preferences and their values.
	 * Useful when flushing data to disk
	 */
	getAllPreferences() {
		/** @type {Object<string, unknown>} */
		const preferences = {};
		for (const [preference, value] of this.#storedPreferences) {
			preferences[preference] = value;
		}
		return preferences;
	}

	/**
	 * Write all preferences to disk.
	 */
	async flush() {}

	/**
	 * @param {OnPreferenceLoadCallback} cb
	 */
	onPreferenceLoaded(cb) {
		this.#onPreferenceLoadedCbs.add(cb);
	}

	/**
	 * @param {OnPreferenceLoadCallback} cb
	 */
	removeOnPreferenceLoaded(cb) {
		this.#onPreferenceLoadedCbs.delete(cb);
	}

	/**
	 * @param {string} preference
	 */
	delete(preference) {
		return this.#storedPreferences.delete(preference);
	}

	/**
	 * @param {string} preference
	 */
	get(preference) {
		return this.#storedPreferences.get(preference);
	}

	/**
	 * @param {string} preference
	 * @param {unknown} value
	 */
	set(preference, value) {
		this.#storedPreferences.set(preference, value);
	}

	/**
	 * @param {string} preference
	 */
	has(preference) {
		return this.#storedPreferences.has(preference);
	}
}
