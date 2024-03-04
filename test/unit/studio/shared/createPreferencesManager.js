import { PreferencesManager } from "../../../../studio/src/preferences/PreferencesManager.js";
import { PreferencesLocation } from "../../../../studio/src/preferences/preferencesLocation/PreferencesLocation.js";

/**
 * Creates a basic preferences manager that can be used in tests.
 * By default this only contains a single `GlobalPreferencesLocation`.
 * @template {Object<string, import("../../../../studio/src/preferences/PreferencesManager.js").PreferenceConfig>} TPreferences
 * @param {TPreferences} registerPreferences
 */
export function createPreferencesManager(registerPreferences) {
	/** @type {PreferencesManager<TPreferences>} */
	const preferencesManager = new PreferencesManager();
	preferencesManager.registerPreferences(registerPreferences);

	preferencesManager.addLocation(new PreferencesLocation("global"));

	const preferencesManagerAny = /** @type {PreferencesManager<any>} */ (preferencesManager);
	return {
		/**
		 * The created preferences manager with the correct generic type.
		 * This allows you to get the correct return types when using `preferencesManager.get()`.
		 * When mocking a studio instance, however, this will result in a type error.
		 * In that case use `preferencesManagerAny` instead.
		 */
		preferencesManager,
		/**
		 * The created preferences manager but without generic types.
		 * Return types from things like `preferencesManager.get()` will be `any`,
		 * but you can use this to create a mock studio instance.
		 */
		preferencesManagerAny,
	};
}
