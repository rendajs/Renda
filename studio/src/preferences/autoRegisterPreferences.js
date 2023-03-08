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
	}),
	"entityEditor.invertScrollOrbitY": pref({
		type: "boolean",
	}),
	"entityEditor.orbitLookPos": pref({type: "unknown"}),
	"entityEditor.orbitLookRot": pref({type: "unknown"}),
	"entityEditor.orbitLookDist": pref({type: "number"}),
	"entityEditor.loadedEntityPath": pref({type: "unknown"}),
});

/** @typedef {keyof autoRegisterPreferences} AutoRegisterPreferenceTypes */
export {autoRegisterPreferences};
