/** @typedef {"global" | "workspace" | "version-control" | "project" | "workspace" | "contentwindow-workspace" | "contentwindow-project"} PreferenceLocationTypes */

export class PreferencesLocation {
	locationType;
	/** @type {Map<string, unknown>} */
	#storedPreferences = new Map();

	/**
	 * @param {PreferenceLocationTypes} locationType
	 */
	constructor(locationType) {
		this.locationType = locationType;
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
