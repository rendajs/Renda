import {ContentWindowPreferencesLocation} from "./preferencesLocation/ContentWindowPreferencesLocation.js";

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

	/**
	 * @typedef OnChangeEventCallbackGroup
	 * @property {Set<OnPreferenceChangeCallback<any>>} callbacks
	 * @property {Map<import("../../../src/mod.js").UuidString, Set<OnPreferenceChangeCallback<any>>>} contentWindowCallbacks
	 */

	/** @type {Map<PreferenceTypes, OnChangeEventCallbackGroup>} */
	#onChangeEventCallbacks = new Map();

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
				let contentWindowUuid = null;
				let value;
				if (location instanceof ContentWindowPreferencesLocation) {
					contentWindowUuid = location.contentWindowUuid;
					value = this.get(castKey, {contentWindowUuid});
				} else {
					value = this.get(castKey);
				}
				this.#fireChangeEvent(castKey, contentWindowUuid, {
					location: location.locationType,
					trigger: "load",
					value,
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
	 * Controls the `trigger` value of change events. Defaults to false.
	 * @property {import("./preferencesLocation/PreferencesLocation.js").PreferenceLocationTypes} [location] The location
	 * where the preference should be changed. Defaults to the defaultLocation of the specified preference.
	 * @property {import("../../../src/mod.js").UuidString} [contentWindowUuid]
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
			if (location.locationType != locationType) return false;
			if (location instanceof ContentWindowPreferencesLocation) {
				if (!locationOptions?.contentWindowUuid) return false;
				if (locationOptions.contentWindowUuid != location.contentWindowUuid) return false;
			}
			return true;
		});
		if (!location) {
			throw new Error(`"${locationType}" preference location was not found.`);
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
		const previousContentWindowValue = this.get(preference, {contentWindowUuid: setPreferenceOptions?.contentWindowUuid});

		const location = this.#getLocation(preference, setPreferenceOptions);
		const cbResult = cb(location);
		const flush = setPreferenceOptions?.flush ?? true;
		if (flush) location.flush();
		this.#locationsFlushed.set(location, flush);

		const newValue = this.get(preference);
		if (newValue != previousValue) {
			this.#fireChangeEvent(preference, null, {
				location: location.locationType,
				trigger: setPreferenceOptions?.performedByUser ? "user" : "application",
				value: newValue,
			});
		}

		if (setPreferenceOptions?.contentWindowUuid) {
			const newContentWindowValue = this.get(preference, {contentWindowUuid: setPreferenceOptions?.contentWindowUuid});
			if (newContentWindowValue != previousContentWindowValue) {
				this.#fireChangeEvent(preference, setPreferenceOptions.contentWindowUuid, {
					location: location.locationType,
					trigger: setPreferenceOptions?.performedByUser ? "user" : "application",
					value: newContentWindowValue,
				});
			}
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
	 * @param {object} options
	 * @param {import("../../../src/mod.js").UuidString} [options.contentWindowUuid]
	 */
	get(preference, {
		contentWindowUuid,
	} = {}) {
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
		let foundContentWindowLocation = false;
		for (const location of this.#registeredLocations) {
			if (location instanceof ContentWindowPreferencesLocation) {
				if (!contentWindowUuid) continue;
				if (location.contentWindowUuid != contentWindowUuid) continue;
				foundContentWindowLocation = true;
			}
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
		if (contentWindowUuid && !foundContentWindowLocation) {
			throw new Error(`A content window uuid was provided ("${contentWindowUuid}") but no location for this uuid was found.`);
		}
		return /** @type {GetPreferenceType<T>} */ (value);
	}

	/**
	 * @template {PreferenceTypes} T
	 * @param {T} preference
	 * @param {OnPreferenceChangeCallback<GetPreferenceType<T>>} cb
	 * @param {object} options
	 * @param {import("../../../src/mod.js").UuidString} [options.contentWindowUuid]
	 */
	onChange(preference, cb, {
		contentWindowUuid,
	} = {}) {
		let group = this.#onChangeEventCallbacks.get(preference);
		if (!group) {
			group = {
				callbacks: new Set(),
				contentWindowCallbacks: new Map(),
			};
			this.#onChangeEventCallbacks.set(preference, group);
		}

		let callbacks;
		if (contentWindowUuid) {
			callbacks = group.contentWindowCallbacks.get(contentWindowUuid);
			if (!callbacks) {
				callbacks = new Set();
				group.contentWindowCallbacks.set(contentWindowUuid, callbacks);
			}
		} else {
			callbacks = group.callbacks;
		}
		callbacks.add(cb);

		cb({
			location: null,
			trigger: "initial",
			value: this.get(preference, {contentWindowUuid}),
		});
	}

	/**
	 * @template {PreferenceTypes} T
	 * @param {T} preference
	 * @param {OnPreferenceChangeCallback<GetPreferenceType<T>>} cb
	 * @param {object} options
	 * @param {import("../../../src/mod.js").UuidString} [options.contentWindowUuid]
	 */
	removeOnChange(preference, cb, {
		contentWindowUuid,
	} = {}) {
		const group = this.#onChangeEventCallbacks.get(preference);
		if (!group) return;

		let performDeleteCheck = false;
		if (contentWindowUuid) {
			const callbacks = group.contentWindowCallbacks.get(contentWindowUuid);
			if (!callbacks) return;
			callbacks.delete(cb);
			if (callbacks.size == 0) {
				group.contentWindowCallbacks.delete(contentWindowUuid);
				performDeleteCheck = true;
			}
		} else {
			group.callbacks.delete(cb);
			if (group.callbacks.size == 0) {
				performDeleteCheck = true;
			}
		}

		if (performDeleteCheck && group.callbacks.size == 0 && group.contentWindowCallbacks.size == 0) {
			this.#onChangeEventCallbacks.delete(preference);
		}
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
		const group = this.#onChangeEventCallbacks.get(preference);
		if (!group) return;

		let callbacks;
		if (contentWindowUuid) {
			callbacks = group.contentWindowCallbacks.get(contentWindowUuid);
		} else {
			callbacks = group.callbacks;
		}
		if (!callbacks) return;
		callbacks.forEach(cb => cb(event));
	}
}

