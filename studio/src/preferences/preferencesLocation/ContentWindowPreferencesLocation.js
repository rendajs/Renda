import {PreferencesLocation} from "./PreferencesLocation.js";

export class ContentWindowPreferencesLocation extends PreferencesLocation {
	/**
	 * @param {import("./PreferencesLocation.js").PreferenceLocationTypes} locationType
	 * @param {import("../../../../src/mod.js").UuidString} contentWindowUuid
	 */
	constructor(locationType, contentWindowUuid) {
		super(locationType);
		this.contentWindowUuid = contentWindowUuid;
	}
}
