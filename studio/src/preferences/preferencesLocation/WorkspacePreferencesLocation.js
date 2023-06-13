import {PreferencesLocation} from "./PreferencesLocation.js";

/**
 * @fileoverview A preferences location that stores preferences in a workspace.
 * This is used for both the "contentwindow-workspace" and "workspace" locations,
 * with the only difference between the two being the destination of the saved data.
 */

export class WorkspacePreferencesLocation extends PreferencesLocation {
	#preferencesLoaded = false;

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
	}
}
