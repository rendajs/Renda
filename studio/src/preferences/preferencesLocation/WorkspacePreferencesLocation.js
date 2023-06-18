import {PreferencesLocation} from "./PreferencesLocation.js";

/**
 * @fileoverview A preferences location that stores preferences in a workspace.
 * This is used for the "workspace" location.
 */

export class WorkspacePreferencesLocation extends PreferencesLocation {
	/**
	 * @param {import("./PreferencesLocation.js").PreferenceLocationTypes} locationType
	 * @param {Object<string, unknown>} preferences
	 */
	constructor(locationType, preferences) {
		super(locationType);
		this.loadPreferences(preferences);
	}

	/**
	 * @override
	 */
	async flush() {
		this.#onFlushRequestCbs.forEach(cb => cb());
	}

	/** @type {Set<() => void>} */
	#onFlushRequestCbs = new Set();

	/**
	 * @param {() => void} cb
	 */
	onFlushRequest(cb) {
		this.#onFlushRequestCbs.add(cb);
	}
}
