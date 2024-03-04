import { PreferencesLocation } from "./PreferencesLocation.js";

/**
 * A preference location used for both "contentwindow-project" and "contentwindow-workspace".
 */
export class ContentWindowPreferencesLocation extends PreferencesLocation {
	#windowManager;

	/**
	 * @param {import("./PreferencesLocation.js").PreferenceLocationTypes} locationType
	 * @param {import("../../windowManagement/WindowManager.js").WindowManager} windowManager
	 * @param {import("../../../../src/mod.js").UuidString} contentWindowUuid
	 */
	constructor(locationType, windowManager, contentWindowUuid) {
		super(locationType);
		this.#windowManager = windowManager;
		this.contentWindowUuid = contentWindowUuid;
	}

	/**
	 * @override
	 */
	async flush() {
		if (this.locationType == "contentwindow-project") {
			await this.#windowManager.requestContentWindowProjectPreferencesFlush();
		} else if (this.locationType == "contentwindow-workspace") {
			await this.#windowManager.saveActiveWorkspace();
		}
	}
}
