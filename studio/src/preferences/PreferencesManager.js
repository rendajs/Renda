/**
 * @typedef PreferenceTypesMap
 * @property {boolean} boolean
 * @property {number} number
 * @property {string} string
 */

/** @typedef {keyof PreferenceTypesMap} PreferenceValueTypes */
/**
 * @template {PreferenceValueTypes} T
 * @typedef {T extends PreferenceValueTypes ? PreferenceConfigGeneric<T> : never} PreferenceConfigHelper
 */

/**
 * @template {PreferenceValueTypes} [T = PreferenceValueTypes]
 * @typedef PreferenceConfigGeneric
 * @property {T} type
 * @property {PreferenceTypesMap[T]} [default]
 * @property {import("./preferencesLocation/PreferencesLocation.js").PreferenceLocationTypes} [defaultLocation] The default
 * location where the preference will be stored. This defaults to "global" when not set.
 * When modifying preferences, the user can choose where the modified value should be stored.
 * If the user does not choose a location, each preference will have its own default location.
 */
/** @typedef {PreferenceConfigHelper<PreferenceValueTypes>} PreferenceConfig */

/**
 * @type {import("./preferencesLocation/PreferencesLocation.js").PreferenceLocationTypes[]}
 */
const locationTypePriorities = [
	"global",
	"workspace",
	"version-control",
	"project",
	"contentwindow-workspace",
	"contentwindow-project",
];

/**
 * @template {Object<string, PreferenceConfig>} TRegisteredPreferences
 */
export class PreferencesManager {
	/** @typedef {keyof TRegisteredPreferences extends string ? keyof TRegisteredPreferences : never} PreferenceTypes */
	/**
	 * @template {PreferenceTypes | string} T
	 * @typedef {T extends PreferenceTypes ?
	 * 	TRegisteredPreferences[T]["type"] extends infer Type ?
	 * 		Type extends import("./PreferencesManager.js").PreferenceValueTypes ?
	 * 			import("./PreferencesManager.js").PreferenceTypesMap[Type] :
	 * 			never :
	 * 		never :
	 * 	never} GetPreferenceType
	 */
	/** @type {Map<string | PreferenceTypes, PreferenceConfig>} */
	#registeredPreferences = new Map();
	/** @type {import("./preferencesLocation/PreferencesLocation.js").PreferencesLocation[]} */
	#registeredLocations = [];

	/**
	 * @param {string | PreferenceTypes} preference
	 * @param {PreferenceConfig} preferenceConfig
	 */
	registerPreference(preference, preferenceConfig) {
		this.#registeredPreferences.set(preference, preferenceConfig);
	}

	/**
	 * @param {Object<PreferenceTypes, PreferenceConfig>} preferences
	 */
	registerPreferences(preferences) {
		for (const [preference, config] of Object.entries(preferences)) {
			this.registerPreference(preference, config);
		}
	}

	/**
	 * @param {import("./preferencesLocation/PreferencesLocation.js").PreferencesLocation} location
	 */
	addLocation(location) {
		if (!this.#registeredLocations.includes(location)) {
			this.#registeredLocations.push(location);
		}
		this.#registeredLocations.sort((a, b) => {
			const indexA = locationTypePriorities.indexOf(a.locationType);
			const indexB = locationTypePriorities.indexOf(b.locationType);
			return indexB - indexA;
		});
	}

	/**
	 * @param {import("./preferencesLocation/PreferencesLocation.js").PreferencesLocation} location
	 */
	removeLocation(location) {
		this.#registeredLocations = this.#registeredLocations.filter(l => l != location);
	}

	/**
	 * @typedef LocationOptions
	 * @property {import("./preferencesLocation/PreferencesLocation.js").PreferenceLocationTypes} [location] The location
	 * where the preference should be changed. Defaults to the defaultLocation of the specified preference.
	 */

	/**
	 * @param {PreferenceTypes} preference
	 * @param {LocationOptions} [locationOptions]
	 */
	#getLocation(preference, locationOptions) {
		let locationType = locationOptions?.location;
		if (!locationType) {
			const preferenceConfig = this.#registeredPreferences.get(preference);
			locationType = preferenceConfig?.defaultLocation;
		}
		if (!locationType) {
			locationType = "global";
		}
		const location = this.#registeredLocations.find(location => {
			if (location.locationType == locationType) return true;
			return false;
		});
		if (!location) {
			throw new Error("Assertion failed, no preference location was found.");
		}
		return location;
	}

	/**
	 * Resets a preference back to its default value, or if a value has been set on a different location
	 * the value may get reset to the value of that location depending on its priority.
	 * @param {PreferenceTypes} preference
	 * @param {LocationOptions} locationOptions
	 */
	reset(preference, locationOptions) {
		const location = this.#getLocation(preference, locationOptions);
		return location.delete(preference);
	}

	/**
	 * Sets the value of a preference. Optionally you can specify the location where the preference should be stored.
	 * If a value has been set on another location with a higher priority, then the value of the preference will not change.
	 * Instead the value will only be set for the specified location.
	 * @template {PreferenceTypes} T
	 * @param {T} preference
	 * @param {GetPreferenceType<T>} value
	 * @param {LocationOptions} [locationOptions]
	 */
	set(preference, value, locationOptions) {
		const location = this.#getLocation(preference, locationOptions);
		location.set(preference, value);
	}

	/**
	 * @template {PreferenceTypes} T
	 * @param {T} preference
	 * @returns {GetPreferenceType<T>}
	 */
	get(preference) {
		const preferenceConfig = this.#registeredPreferences.get(preference);
		if (!preferenceConfig) {
			throw new Error(`Preference "${preference}" has not been registered.`);
		}
		let value = preferenceConfig.default;
		if (preferenceConfig.type == "boolean") {
			value = value || false;
		} else if (preferenceConfig.type == "number") {
			value = value || 0;
		} else if (preferenceConfig.type == "string") {
			value = value || "";
		}
		for (const location of this.#registeredLocations) {
			if (location.has(preference)) {
				value = location.get(preference);
				break;
			}
		}
		return value;
	}
}
