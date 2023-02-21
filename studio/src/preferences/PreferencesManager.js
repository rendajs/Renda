/**
 * @typedef PreferenceTypesMap
 * @property {boolean} boolean
 * @property {number} number
 * @property {string} string
 */

import {EventHandler} from "../../../src/util/EventHandler.js";

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
 * - `"initial"` Events are guaranteed to fire once when you register the event listener for the first time.
 * - `"user"` The change was caused by the user changing a value via UI.
 * - `"load"` A new preferences location has been loaded, for instance when a new project is opened, or the current workspace has been changed.
 * - `"application"` The value was changed programatically.
 * @typedef {"initial" | "user" | "load" | "application"} PreferenceChangeEventTrigger
 */

/**
 * @template T
 * @typedef OnPreferenceChangeEvent
 * @property {T} value The current value of the preference.
 * @property {PreferenceChangeEventTrigger} trigger What type of action triggered the event.
 * @property {import("./preferencesLocation/PreferencesLocation.js").PreferenceLocationTypes?} location The location
 * that changed and caused the value to change. Note that this location is not necessarily the location that currently
 * has a value set. For instance, a location might reset a preference to the default.
 * In that case the current value is either the default value, or from a location with lower priority.
 * The location is `null` when the event fires for the first time, in which case `trigger` will be `"initial"`.
 */

/**
 * @template T
 * @typedef {(e: OnPreferenceChangeEvent<T>) => void} OnPreferenceChangeCallback
 */

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
	/** @type {WeakMap<import("./preferencesLocation/PreferencesLocation.js").PreferencesLocation, boolean>} */
	#locationsFlushed = new WeakMap();

	/** @type {EventHandler<PreferenceTypes, OnPreferenceChangeEvent<any>>} */
	#onChangeHandler = new EventHandler();

	/** @type {Map<import("./preferencesLocation/PreferencesLocation.js").PreferencesLocation, import("./preferencesLocation/PreferencesLocation.js").OnPreferenceLoadCallback>} */
	#onPreferenceLoadedHandlers = new Map();

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

			/**
			 * @param {string} key
			 */
			const onPreferenceLoaded = key => {
				const castKey = /** @type {PreferenceTypes} */ (key);
				this.#onChangeHandler.fireEvent(castKey, {
					location: location.locationType,
					trigger: "load",
					value: this.get(castKey),
				});
			};
			if (this.#onPreferenceLoadedHandlers.has(location)) {
				throw new Error("Assertion failed, a handler has already been registered");
			}
			this.#onPreferenceLoadedHandlers.set(location, onPreferenceLoaded);
			location.onPreferenceLoaded(onPreferenceLoaded);
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
		const handler = this.#onPreferenceLoadedHandlers.get(location);
		if (handler) location.removeOnPreferenceLoaded(handler);
	}

	/**
	 * @typedef SetPreferenceOptions
	 * @property {boolean} [performedByUser]
	 * @property {import("./preferencesLocation/PreferencesLocation.js").PreferenceLocationTypes} [location] The location
	 * where the preference should be changed. Defaults to the defaultLocation of the specified preference.
	 * @property {boolean} [flush] When set to true (which is the default),
	 * preferences are flushed asynchronously right after the change is applied.
	 */

	/**
	 * @param {PreferenceTypes} preference
	 * @param {SetPreferenceOptions} [locationOptions]
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
	 * @param {SetPreferenceOptions} [setPreferenceOptions]
	 */
	reset(preference, setPreferenceOptions) {
		return this.#changeAndFireEvents(preference, setPreferenceOptions, location => {
			location.delete(preference);
		});
	}

	/**
	 * Sets the value of a preference. Optionally you can specify the location where the preference should be stored.
	 * If a value has been set on another location with a higher priority, then the value of the preference will not change.
	 * Instead the value will only be set for the specified location.
	 * @template {PreferenceTypes} T
	 * @param {T} preference
	 * @param {GetPreferenceType<T>} value
	 * @param {SetPreferenceOptions} [setPreferenceOptions]
	 */
	set(preference, value, setPreferenceOptions) {
		this.#changeAndFireEvents(preference, setPreferenceOptions, location => {
			location.set(preference, value);
		});
	}

	/**
	 * Runs a callback, and verifies if the value of a preference was changed during that callback.
	 * If so, the appropriate events are fired.
	 * @template T
	 * @param {PreferenceTypes} preference
	 * @param {SetPreferenceOptions | undefined} setPreferenceOptions
	 * @param {(location: import("./preferencesLocation/PreferencesLocation.js").PreferencesLocation) => T} cb
	 */
	#changeAndFireEvents(preference, setPreferenceOptions, cb) {
		const previousValue = this.get(preference);
		const location = this.#getLocation(preference, setPreferenceOptions);
		const cbResult = cb(location);
		const flush = setPreferenceOptions?.flush ?? true;
		if (flush) location.flush();
		this.#locationsFlushed.set(location, flush);
		const newValue = this.get(preference);
		if (previousValue != newValue) {
			this.#onChangeHandler.fireEvent(preference, {
				location: location.locationType,
				trigger: setPreferenceOptions?.performedByUser ? "user" : "application",
				value: newValue,
			});
		}
		return cbResult;
	}

	async flush() {
		const promises = [];
		for (const location of this.#registeredLocations) {
			const flushed = this.#locationsFlushed.get(location);
			if (flushed == false) {
				promises.push(location.flush());
				this.#locationsFlushed.set(location, true);
			}
		}
		await Promise.all(promises);
	}

	/**
	 * @template {PreferenceTypes} T
	 * @param {T} preference
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
				const locationValue = location.get(preference);
				if (preferenceConfig.type == "boolean" && typeof locationValue == "boolean") {
					value = locationValue;
					break;
				} else if (preferenceConfig.type == "number" && typeof locationValue == "number") {
					value = locationValue;
					break;
				} else if (preferenceConfig.type == "string" && typeof locationValue == "string") {
					value = locationValue;
					break;
				}
			}
		}
		return /** @type {GetPreferenceType<T>} */ (value);
	}

	/**
	 * @template {PreferenceTypes} T
	 * @param {T} preference
	 * @param {OnPreferenceChangeCallback<GetPreferenceType<T>>} cb
	 */
	onChange(preference, cb) {
		this.#onChangeHandler.addEventListener(preference, cb);
		cb({
			location: null,
			trigger: "initial",
			value: this.get(preference),
		});
	}

	/**
	 * @template {PreferenceTypes} T
	 * @param {T} preference
	 * @param {OnPreferenceChangeCallback<GetPreferenceType<T>>} cb
	 */
	removeOnChange(preference, cb) {
		this.#onChangeHandler.removeEventListener(preference, cb);
	}
}
