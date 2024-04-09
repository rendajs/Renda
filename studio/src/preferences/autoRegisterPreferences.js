import { ProjectAssetTypeEntity } from "../assets/projectAssetType/ProjectAssetTypeEntity.js";
import { ProjectAssetTypeHtml } from "../assets/projectAssetType/ProjectAssetTypeHtml.js";
import { ProjectAssetTypeJavascript } from "../assets/projectAssetType/ProjectAssetTypeJavascript.js";

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
	"entityEditor.scrollBehavior": pref({
		type: "enum",
		enum: /** @type {["auto", "zoom", "orbit"]} */ (["auto", "zoom", "orbit"]),
		description: `The behaviour of the scrollwheel.
- "zoom" is recommended when a physical mousewheel is used.
The camera moves forwards and backwards when scrolling.
Since the user is using a mouse, they can likely orbit the camera using middle mouse button instead.
- "orbit" is recommended when a precision touchpad is used.
The user typically scrolls pages using gestures with two finger,
and scroll events often contain scroll information from two axes.
This mode allows the user to orbit the camera using this gesture,
and moving the camera forwards and backwards can be achieved using a
pinch gesture or by holding the ctrl key.`,
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
		default: [-0.18354652845927133, 0.3750552419545938, 0.07602746141432946, 0.9054634517659029],
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
	"studioConnections.enableRemoteDiscovery": pref({
		type: "boolean",
		defaultLocation: "project",
		allowedLocations: ["project"],
	}),
	"studioConnections.enableInternalDiscovery": pref({
		type: "boolean",
		defaultLocation: "project",
		allowedLocations: ["project"],
	}),
	"buildView.availableScriptEntryPoints": pref({
		type: "gui",
		allowedLocations: ["project", "version-control", "contentwindow-project"],
		defaultLocation: "version-control",
		guiOpts: {
			type: "array",
			guiOpts: {
				arrayType: "droppable",
				arrayGuiOpts: {
					supportedAssetTypes: [ProjectAssetTypeHtml, ProjectAssetTypeJavascript],
				},
			},
		},
	}),
	"buildView.availableEntityEntryPoints": pref({
		type: "gui",
		allowedLocations: ["project", "version-control", "contentwindow-project"],
		defaultLocation: "version-control",
		guiOpts: {
			type: "array",
			guiOpts: {
				arrayType: "droppable",
				arrayGuiOpts: {
					supportedAssetTypes: [ProjectAssetTypeEntity],
				},
			},
		},
	}),
	"buildView.selectedScriptEntryPoint": pref({
		type: "string",
		allowedLocations: ["contentwindow-project"],
		defaultLocation: "contentwindow-project",
	}),
	"buildView.selectedEntityEntryPoint": pref({
		type: "string",
		allowedLocations: ["contentwindow-project"],
		defaultLocation: "contentwindow-project",
	}),
});

/** @typedef {keyof autoRegisterPreferences} AutoRegisterPreferenceTypes */
export { autoRegisterPreferences };
