import {PreferencesLocation} from "./PreferencesLocation.js";

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
		await this.#windowManager.requestContentWindowPreferencesFlush();
	}
}
