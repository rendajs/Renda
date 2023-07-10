import {prettifyVariableName} from "../util/util.js";
import {ContentWindowPreferencesLocation} from "./preferencesLocation/ContentWindowPreferencesLocation.js";

/**
 * @typedef PreferenceTypesMap
 * @property {boolean} boolean
 * @property {number} number
 * @property {string} string
 * @property {unknown} unknown
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
 * @property {string} [uiName] The name of the setting that is shown in UI.
 * When not set, the UI name will be inferred from the setting name:
 * - If the name contains dots, only the characters after the last dot is used.
 * - Camel case will be converted to title case using `prettifyVariableName()`.
 * @property {string} [description] Description that is shown in UI explaining what the setting does.
 * @property {PreferenceTypesMap[T]} [default]
 * @property {import("./preferencesLocation/PreferencesLocation.js").PreferenceLocationTypes} [defaultLocation] The default
 * location where the preference will be stored. This defaults to "global" when not set.
 * When modifying preferences, the user can choose where the modified value should be stored.
 * If the user does not choose a location, each preference will have its own default location.
 * @property {import("./preferencesLocation/PreferencesLocation.js").PreferenceLocationTypes[]} [allowedLocations] When set,
 * only the provided locations can be modified for this preference. Any other locations will be greyed out for the user,
 * and trying to set these programmatically will result in an error.
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
 * that changed and caused the value to change. Note that this is not necessarily the location that was changed.
 * For instance, a location might reset a preference to the default.
 * In that case the current value is either the default value, or from a location with lower priority.
 * The location is `null` when the event fires for the first time, in which case `trigger` will be `"initial"`.
 */

/**
 * @template T
 * @typedef {(e: OnPreferenceChangeEvent<T>) => void} OnPreferenceChangeCallback
 */

/**
 * @typedef OnPreferenceChangeAnyEvent
 * @property {PreferenceChangeEventTrigger} trigger What type of action triggered the event.
 * @property {import("./preferencesLocation/PreferencesLocation.js").PreferenceLocationTypes?} location The location that got modified.
 */

/** @typedef {(e: OnPreferenceChangeAnyEvent) => void} OnPreferenceChangeAnyCallback */

/**
 * @type {import("./preferencesLocation/PreferencesLocation.js").PreferenceLocationTypes[]}
 */
export const locationTypePriorities = [
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
	/** @typedef {keyof TRegisteredPreferences extends string ? keyof TRegisteredPreferences : string} PreferenceTypes */
	/** @typedef {PreferenceTypes | (string & {})} PreferenceTypesOrString */
	/**
	 * @template {PreferenceTypesOrString} T
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
	/** @type {WeakSet<import("./preferencesLocation/PreferencesLocation.js").PreferencesLocation>} */
	#unflushedLocations = new WeakSet();

	/** @type {Map<PreferenceTypes, Map<import("../../../src/mod.js").UuidString?, Set<OnPreferenceChangeCallback<any>>>>} */
	#onChangeCallbacks = new Map();
	/** @type {Set<OnPreferenceChangeAnyCallback>} */
	#onChangeAnyCallbacks = new Set();

	/** @type {Map<import("./preferencesLocation/PreferencesLocation.js").PreferencesLocation, import("./preferencesLocation/PreferencesLocation.js").OnPreferenceLoadCallback>} */
	#onPreferenceLoadedHandlers = new Map();

	/**
	 * @param {TRegisteredPreferences} [preferences]
	 */
	constructor(preferences) {
		if (preferences) {
			this.registerPreferences(preferences);
		}
	}

	/**
	 * @param {string | PreferenceTypes} preference
	 * @param {PreferenceConfig} preferenceConfig
	 */
	registerPreference(preference, preferenceConfig) {
		if (preferenceConfig.allowedLocations) {
			if (preferenceConfig.allowedLocations.length == 0) {
				throw new Error(`Preference "${preference}" was registered with an empty allowedLocations array.`);
			}
			const defaultLocation = this.#getDefaultLocationFromConfig(preferenceConfig);
			if (!preferenceConfig.allowedLocations.includes(defaultLocation)) {
				throw new Error(`Preference "${preference}" was registered with "${defaultLocation}" as default location but this location type was missing from the allowedLocation array.`);
			}
		}
		this.#registeredPreferences.set(preference, preferenceConfig);
	}

	/**
	 * @param {Object<PreferenceTypes, PreferenceConfig>} preferences
	 */
	registerPreferences(preferences) {
		const castPreferences = /** @type {Object<string, PreferenceConfig>} */ (preferences);
		for (const [preference, config] of Object.entries(castPreferences)) {
			this.registerPreference(preference, config);
		}
	}

	/**
	 * Gets a preference config and assert that it has been registered.
	 * @param {PreferenceTypesOrString} preference
	 */
	#getPreferenceConfig(preference) {
		const config = this.#registeredPreferences.get(preference);
		if (!config) {
			throw new Error(`The preference "${preference}" has not been registered.`);
		}
		return config;
	}

	/**
	 * Returns configuration data for a preference that is needed to show UI for this preference.
	 * @param {PreferenceTypesOrString} preference
	 */
	getPreferenceUiData(preference) {
		const config = this.#getPreferenceConfig(preference);
		let uiName = "";
		if (config.uiName) {
			uiName = config.uiName;
		} else {
			const lastPart = preference.split(".").at(-1);
			if (!lastPart) {
				throw new Error("Preference UI name could not be determined.");
			}
			uiName = prettifyVariableName(lastPart);
		}
		let allowedLocations = null;
		if (config.allowedLocations) {
			allowedLocations = Array.from(config.allowedLocations);
		}
		return {
			type: config.type,
			uiName,
			allowedLocations,
		};
	}

	/**
	 * @param {PreferenceConfig} preferencesConfig
	 */
	#getDefaultLocationFromConfig(preferencesConfig) {
		return preferencesConfig?.defaultLocation || "global";
	}

	/**
	 * @param {PreferenceTypesOrString} preference
	 */
	getDefaultLocation(preference) {
		const config = this.#getPreferenceConfig(preference);
		return this.#getDefaultLocationFromConfig(config);
	}

	/**
	 * Returns the default value from a preference config and fills it in if it doesn't exist.
	 * @param {PreferenceConfig} preferenceConfig
	 */
	#getDefaultValueFromConfig(preferenceConfig) {
		const value = preferenceConfig.default;
		if (preferenceConfig.type == "boolean") {
			return value || false;
		} else if (preferenceConfig.type == "number") {
			return value || 0;
		} else if (preferenceConfig.type == "string") {
			return value || "";
		} else if (preferenceConfig.type == "unknown") {
			return value;
		} else {
			const type = /** @type {any} */ (preferenceConfig).type;
			throw new Error(`Unexpected preference type: "${type}"`);
		}
	}

	/**
	 * @param {PreferenceTypesOrString} preference
	 */
	getDefaultValue(preference) {
		const config = this.#getPreferenceConfig(preference);
		return this.#getDefaultValueFromConfig(config);
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
				this.#runAndFireEvents({
					preference: castKey,
					excludeLocations: [location],
					eventLocationType: location.locationType,
					eventTrigger: "load",
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
	 * @property {boolean} [performedByUser] Whether the value was changed by the user.
	 * Controls the `trigger` value of change events:
	 *
	 * - `"user"` when set to `true`.
	 * - `"application"` when set to `false`.
	 *
	 * Defaults to false.
	 * @property {import("./preferencesLocation/PreferencesLocation.js").PreferenceLocationTypes?} [location] The location
	 * where the preference should be changed. Defaults to the defaultLocation of the specified preference.
	 * @property {import("../../../src/mod.js").UuidString} [contentWindowUuid]
	 * @property {boolean} [flush] When set to true (which is the default),
	 * preferences are flushed asynchronously right after the change is applied.
	 */

	/**
	 * @param {PreferenceTypes} preference
	 * @param {SetPreferenceOptions} [locationOptions]
	 */
	#getLocationAndConfig(preference, locationOptions) {
		const preferenceConfig = this.#getPreferenceConfig(preference);
		const locationType = locationOptions?.location || this.#getDefaultLocationFromConfig(preferenceConfig);
		const location = this.#registeredLocations.find(location => {
			if (location.locationType != locationType) return false;
			if (location instanceof ContentWindowPreferencesLocation) {
				if (!locationOptions?.contentWindowUuid) return false;
				if (locationOptions.contentWindowUuid != location.contentWindowUuid) return false;
			}
			return true;
		});
		if (!location) {
			if (locationOptions?.contentWindowUuid && (locationType == "contentwindow-project" || locationType == "contentwindow-workspace")) {
				this.#throwContentWindowUuidNotFound(locationOptions.contentWindowUuid);
			} else {
				throw new Error(`"${locationType}" preference location was not found.`);
			}
		}
		return {location, preferenceConfig};
	}

	/**
	 * @param {import("../../../src/mod.js").UuidString} contentWindowUuid
	 * @returns {never}
	 */
	#throwContentWindowUuidNotFound(contentWindowUuid) {
		throw new Error(`A content window uuid was provided ("${contentWindowUuid}") but no location for this uuid was found.`);
	}

	/**
	 * Resets a preference back to its default value, or if a value has been set on a different location
	 * the value may get reset to the value of that location depending on its priority.
	 * @param {PreferenceTypes} preference
	 * @param {SetPreferenceOptions} [setPreferenceOptions]
	 */
	reset(preference, setPreferenceOptions) {
		return this.#changeLocationAndFireEvents(preference, setPreferenceOptions, location => {
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
		this.#changeLocationAndFireEvents(preference, setPreferenceOptions, (location, preferenceConfig) => {
			if (preferenceConfig.allowedLocations && !preferenceConfig.allowedLocations.includes(location.locationType)) {
				throw new Error(`"${location.locationType}" is not an allowed location for this preference.`);
			}
			location.set(preference, value);
		});
	}

	*#getContentWindowLocationUuids() {
		/** @type {Set<import("../../../src/mod.js").UuidString>} */
		const uuids = new Set();
		for (const location of this.#registeredLocations) {
			if (location instanceof ContentWindowPreferencesLocation) {
				if (!uuids.has(location.contentWindowUuid)) {
					uuids.add(location.contentWindowUuid);
					yield location.contentWindowUuid;
				}
			}
		}
	}

	/**
	 * Runs a callback with a location and compares the changes from before and after the callback.
	 * Fires events based on the changes.
	 * @param {PreferenceTypes} preference
	 * @param {SetPreferenceOptions | undefined} setPreferenceOptions
	 * @param {(location: import("./preferencesLocation/PreferencesLocation.js").PreferencesLocation, config: PreferenceConfig) => void} cb
	 */
	#changeLocationAndFireEvents(preference, setPreferenceOptions, cb) {
		const {location, preferenceConfig} = this.#getLocationAndConfig(preference, setPreferenceOptions);
		const trigger = setPreferenceOptions?.performedByUser ? "user" : "application";
		this.#runAndFireEvents({
			preference,
			eventLocationType: location.locationType,
			eventTrigger: trigger,
			cb: () => {
				cb(location, preferenceConfig);
				const flush = setPreferenceOptions?.flush ?? true;
				if (flush) {
					location.flush();
					this.#unflushedLocations.delete(location);
				} else {
					this.#unflushedLocations.add(location);
				}
			},
		});
	}

	/**
	 * Runs a callback and compares the changes from before and after the callback.
	 * Fires events based on the changes.
	 * @param {object} options
	 * @param {PreferenceTypes} options.preference
	 * @param {import("./preferencesLocation/PreferencesLocation.js").PreferenceLocationTypes} options.eventLocationType
	 * @param {PreferenceChangeEventTrigger} options.eventTrigger
	 * @param {() => void} [options.cb]
	 * @param {import("./preferencesLocation/PreferencesLocation.js").PreferencesLocation[]} [options.excludeLocations] Filters locations
	 * from the first value query. The second value (after the callback) will be queried without any excluded locations
	 * and will be comapred against the first value query.
	 */
	#runAndFireEvents({preference, eventLocationType, eventTrigger, cb, excludeLocations}) {
		/** @type {Map<import("../../../src/mod.js").UuidString, unknown>} */
		const oldLocationValues = new Map();

		for (const uuid of this.#getContentWindowLocationUuids()) {
			const {value} = this.#getInternal(preference, uuid, {excludeLocations, assertRegistered: false});
			oldLocationValues.set(uuid, value);
		}
		const {value: oldWindowLessValue} = this.#getInternal(preference, null, {excludeLocations, assertRegistered: false});

		if (cb) cb();

		for (const [uuid, oldValue] of oldLocationValues) {
			const {value: newValue} = this.#getInternal(preference, uuid, {assertRegistered: false});
			if (newValue != oldValue) {
				this.#fireChangeEvent(preference, uuid, {
					location: eventLocationType,
					trigger: eventTrigger,
					value: newValue,
				});
			}
		}

		const {value: newWindowLessValue} = this.#getInternal(preference, null, {assertRegistered: false});
		if (newWindowLessValue != oldWindowLessValue) {
			this.#fireChangeEvent(preference, null, {
				location: eventLocationType,
				trigger: eventTrigger,
				value: newWindowLessValue,
			});
		}

		this.#onChangeAnyCallbacks.forEach(cb => {
			cb({
				location: eventLocationType,
				trigger: eventTrigger,
			});
		});
	}

	async flush() {
		const promises = [];
		for (const location of this.#registeredLocations) {
			if (this.#unflushedLocations.has(location)) {
				promises.push(location.flush());
				this.#unflushedLocations.delete(location);
			}
		}
		await Promise.all(promises);
	}

	/**
	 * @template {PreferenceTypesOrString} T
	 * @param {T} preference
	 * @param {import("../../../src/mod.js").UuidString?} contentWindowUuid
	 */
	get(preference, contentWindowUuid) {
		const {value, foundContentWindowLocation} = this.#getInternal(preference, contentWindowUuid);
		if (contentWindowUuid && !foundContentWindowLocation) {
			this.#throwContentWindowUuidNotFound(contentWindowUuid);
		}
		return /** @type {GetPreferenceType<T>} */ (value);
	}

	/**
	 * Same as get but with some extra options that are not meant to be a public api.
	 * @param {string} preference
	 * @param {import("../../../src/mod.js").UuidString?} contentWindowUuid
	 * @param {object} [options]
	 * @param {boolean} [options.assertRegistered]
	 * @param {import("./preferencesLocation/PreferencesLocation.js").PreferencesLocation[]} [options.excludeLocations] Returns a result
	 * as if these locations don't exist or haven't been loaded yet.
	 */
	#getInternal(preference, contentWindowUuid, {
		assertRegistered = true,
		excludeLocations = [],
	} = {}) {
		const preferenceConfig = this.#registeredPreferences.get(preference);
		if (assertRegistered && !preferenceConfig) {
			throw new Error(`The preference "${preference}" has not been registered.`);
		}
		let value = null;
		if (preferenceConfig) {
			value = this.#getDefaultValueFromConfig(preferenceConfig);
		}
		let foundContentWindowLocation = false;
		for (const location of this.#registeredLocations) {
			if (excludeLocations.includes(location)) continue;
			if (location instanceof ContentWindowPreferencesLocation) {
				if (!contentWindowUuid) continue;
				if (location.contentWindowUuid != contentWindowUuid) continue;
				foundContentWindowLocation = true;
			}
			if (preferenceConfig?.allowedLocations && !preferenceConfig.allowedLocations.includes(location.locationType)) {
				continue;
			}
			if (location.has(preference)) {
				const locationValue = location.get(preference);
				if (!preferenceConfig) {
					value = locationValue;
				} else {
					if (preferenceConfig.type == "boolean" && typeof locationValue == "boolean") {
						value = locationValue;
						break;
					} else if (preferenceConfig.type == "number" && typeof locationValue == "number") {
						value = locationValue;
						break;
					} else if (preferenceConfig.type == "string" && typeof locationValue == "string") {
						value = locationValue;
						break;
					} else if (preferenceConfig.type == "unknown") {
						value = locationValue;
						break;
					}
				}
			}
		}
		return {value, foundContentWindowLocation};
	}

	/**
	 * Gets the value of a preference at a specific location.
	 * This should only be used to display the value of a preference in ui,
	 * where the ui reflects that this is the value at that specific location.
	 * The user expects the preference location system to have an effect on the current value of a preference.
	 * So this should not be used to determine desired behaviour based on the value of a preference.
	 * For that {@linkcode get} should be used.
	 * @template {PreferenceTypesOrString} T
	 * @param {T} preference The preference id to get the value for.
	 * @param {import("./preferencesLocation/PreferencesLocation.js").PreferenceLocationTypes?} locationName The location
	 * to get the value at, use `null` to get the default location of that preference.
	 * @param {object} options
	 * @param {import("../../../src/mod.js").UuidString} [options.contentWindowUuid]
	 * @returns {GetPreferenceType<T>?} The value at the specified location, or null when
	 * no value was set for that location. Except when no location is provided, in which case the default value
	 * for the preference is returned.
	 */
	getUiValueAtLocation(preference, locationName, {
		contentWindowUuid,
	} = {}) {
		const preferenceConfig = this.#getPreferenceConfig(preference);
		const {location} = this.#getLocationAndConfig(preference, {
			location: locationName || undefined,
			contentWindowUuid,
		});
		if (preferenceConfig.allowedLocations && !preferenceConfig.allowedLocations.includes(location.locationType)) {
			return null;
		}
		let value = location.get(preference);
		if (value === undefined) {
			if (locationName == null) {
				value = this.#getDefaultValueFromConfig(preferenceConfig);
			} else {
				value = null;
			}
		}
		return /** @type {GetPreferenceType<T>?} */ (value);
	}

	/**
	 * Registers a callback for observing preference changes.
	 * When registered, the callback fires once with `event.trigger` set to `"initial"`.
	 * If the value hasn't been loaded yet at the time of registration, a `"load"` event will also fire once the value has been loaded.
	 *
	 * Events are only fired when the value for the specified content window changes.
	 * This means that if a value has been set for a specific content window and the global value is changed,
	 * no event is fired for that content window.
	 *
	 * @template {PreferenceTypes} T
	 * @param {T} preference
	 * @param {import("../../../src/mod.js").UuidString?} contentWindowUuid
	 * @param {OnPreferenceChangeCallback<GetPreferenceType<T>>} cb
	 */
	onChange(preference, contentWindowUuid, cb) {
		let contentWindowCallbacks = this.#onChangeCallbacks.get(preference);
		if (!contentWindowCallbacks) {
			contentWindowCallbacks = new Map();
			this.#onChangeCallbacks.set(preference, contentWindowCallbacks);
		}

		let callbacks;
		callbacks = contentWindowCallbacks.get(contentWindowUuid);
		if (!callbacks) {
			callbacks = new Set();
			contentWindowCallbacks.set(contentWindowUuid, callbacks);
		}
		callbacks.add(cb);

		const value = this.get(preference, contentWindowUuid);
		cb({
			location: null,
			trigger: "initial",
			value,
		});
	}

	/**
	 * @template {PreferenceTypes} T
	 * @param {T} preference
	 * @param {import("../../../src/mod.js").UuidString?} contentWindowUuid
	 * @param {OnPreferenceChangeCallback<GetPreferenceType<T>>} cb
	 */
	removeOnChange(preference, contentWindowUuid, cb) {
		const contentWindowCallbacks = this.#onChangeCallbacks.get(preference);
		if (!contentWindowCallbacks) return;

		const callbacks = contentWindowCallbacks.get(contentWindowUuid);
		if (!callbacks) return;
		callbacks.delete(cb);
		if (callbacks.size == 0) {
			contentWindowCallbacks.delete(contentWindowUuid);
			if (contentWindowCallbacks.size == 0) {
				this.#onChangeCallbacks.delete(preference);
			}
		}
	}

	/**
	 * Registers a callback that fires when any preference is changed, regardless of its location or content window.
	 * This also fires when a value is set without changing it.
	 *
	 * @param {OnPreferenceChangeAnyCallback} cb
	 */
	onChangeAny(cb) {
		this.#onChangeAnyCallbacks.add(cb);
	}

	/**
	 * @param {OnPreferenceChangeAnyCallback} cb
	 */
	removeOnChangeAny(cb) {
		this.#onChangeAnyCallbacks.delete(cb);
	}

	/**
	 * Fires either the global event callbacks for a preference,
	 * or the event callbacks for a specific content window.
	 * @param {PreferenceTypes} preference
	 * @param {import("../../../src/mod.js").UuidString?} contentWindowUuid The uuid of the
	 * content window to fire the events for. Set to null to fire the global event callbacks.
	 * @param {OnPreferenceChangeEvent<any>} event
	 */
	#fireChangeEvent(preference, contentWindowUuid, event) {
		const contentWindowCallbacks = this.#onChangeCallbacks.get(preference);
		if (!contentWindowCallbacks) return;

		const callbacks = contentWindowCallbacks.get(contentWindowUuid);
		if (!callbacks) return;
		callbacks.forEach(cb => cb(event));
	}
}

