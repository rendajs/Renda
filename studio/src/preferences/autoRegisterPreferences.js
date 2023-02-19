/**
 * Takes a preference type and returns it as const.
 * This only exists to make autocompletions work.
 * @template {import("./PreferencesManager.js").PreferenceConfig} T
 * @param {T} preference
 */
function pref(preference) {
	return preference;
}

const autoRegisterPreferences = /** @type {const} */ ({
	"entityEditor.invertScrollOrbitX": pref({
		type: "boolean",
		default: false,
	}),
	"entityEditor.invertScrollOrbitY": pref({
		type: "boolean",
		default: false,
	}),
});

/** @typedef {keyof autoRegisterPreferences} AutoRegisterPreferenceTypes */
export {autoRegisterPreferences};
