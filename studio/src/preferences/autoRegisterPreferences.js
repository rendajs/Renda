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
	"entityEditor.autosaveEntities": pref({
		type: "boolean",
		default: true,
	}),
	"entityEditor.invertScrollOrbitX": pref({
		type: "boolean",
	}),
	"entityEditor.invertScrollOrbitY": pref({
		type: "boolean",
	}),
	"entityEditor.orbitLookPos": pref({
		type: "unknown",
		default: [0, 0, 0],
	}),
	"entityEditor.orbitLookRot": pref({
		type: "unknown",
		default: [0.13806283196906857, 0.37838630992789435, -0.057187497461225936, 0.9135053612442318],
	}),
	"entityEditor.orbitLookDist": pref({
		type: "number",
		default: 2.5,
	}),
	"entityEditor.loadedEntityPath": pref({
		type: "unknown",
		defaultLocation: "contentwindow-project",
		allowedLocations: ["contentwindow-project"],
	}),
	"entityEditor.showGrid": pref({
		type: "boolean",
		default: true,
	}),
});

/** @typedef {keyof autoRegisterPreferences} AutoRegisterPreferenceTypes */
export {autoRegisterPreferences};
