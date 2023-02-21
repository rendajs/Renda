import {assertEquals} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {PreferencesLocation} from "../../../../../studio/src/preferences/preferencesLocation/PreferencesLocation.js";
import {PreferencesManager} from "../../../../../studio/src/preferences/PreferencesManager.js";

/**
 * Creates a manager and registers a bunch of test types.
 * This ensures the manager has the correct generic type.
 */
function createManager() {
	/**
	 * Takes a preference type and returns it as const.
	 * This only exists to make autocompletions work.
	 * @template {import("../../../../../studio/src/preferences/PreferencesManager.js").PreferenceConfig} T
	 * @param {T} preference
	 */
	function pref(preference) {
		return preference;
	}

	const registerPreferences = /** @type {const} */ ({
		boolPref1: pref({
			type: "boolean",
		}),
		boolPref2: pref({
			type: "boolean",
			default: true,
		}),
		numPref1: pref({
			type: "number",
		}),
		numPref2: pref({
			type: "number",
			default: 42,
		}),
		str: pref({
			type: "string",
		}),
		projectPref: pref({
			type: "string",
			defaultLocation: "project",
		}),
		workspacePref: pref({
			type: "string",
			defaultLocation: "workspace",
			default: "default",
		}),
	});

	/** @type {PreferencesManager<registerPreferences>} */
	const manager = new PreferencesManager();
	manager.registerPreferences(registerPreferences);

	const locations = {
		global: new PreferencesLocation("global"),
		workspace: new PreferencesLocation("workspace"),
		versionControl: new PreferencesLocation("version-control"),
		project: new PreferencesLocation("project"),
	};
	for (const location of Object.values(locations)) {
		manager.addLocation(location);
	}

	return {manager, locations};
}

Deno.test({
	name: "Getting and setting preferences.",
	fn() {
		const {manager} = createManager();

		assertEquals(manager.get("boolPref1"), false);
		assertEquals(manager.get("boolPref2"), true);
		assertEquals(manager.get("numPref1"), 0);
		assertEquals(manager.get("numPref2"), 42);
		assertEquals(manager.get("projectPref"), "");
		assertEquals(manager.get("workspacePref"), "default");

		manager.set("boolPref1", true);
		manager.set("boolPref2", false);
		manager.set("numPref1", 123);
		manager.set("numPref2", 456);
		manager.set("projectPref", "str");
		manager.set("workspacePref", "str2");

		assertEquals(manager.get("boolPref1"), true);
		assertEquals(manager.get("boolPref2"), false);
		assertEquals(manager.get("numPref1"), 123);
		assertEquals(manager.get("numPref2"), 456);
		assertEquals(manager.get("projectPref"), "str");
		assertEquals(manager.get("workspacePref"), "str2");
	},
});

Deno.test({
	name: "Setting preferences at a specific location",
	fn() {
		const {manager} = createManager();

		assertEquals(manager.get("str"), "");
		manager.set("str", "global", {location: "global"});
		assertEquals(manager.get("str"), "global");

		manager.set("str", "project", {location: "project"});
		assertEquals(manager.get("str"), "project");

		manager.set("str", "workspace", {location: "workspace"});
		assertEquals(manager.get("str"), "project");

		manager.set("str", "version-control", {location: "version-control"});
		assertEquals(manager.get("str"), "project");

		manager.reset("str", {location: "project"});
		assertEquals(manager.get("str"), "version-control");

		manager.reset("str", {location: "workspace"});
		assertEquals(manager.get("str"), "version-control");

		manager.reset("str", {location: "version-control"});
		assertEquals(manager.get("str"), "global");

		manager.reset("str", {location: "global"});
		assertEquals(manager.get("str"), "");
	},
});

Deno.test({
	name: "All locations are considered when ",
	fn() {
		const {manager} = createManager();

		manager.set("projectPref", "global", {location: "global"});
		manager.set("projectPref", "project");
		assertEquals(manager.get("projectPref"), "project");
	},
});

Deno.test({
	name: "Events are fired for changed preferences",
	fn() {
		const {manager, locations} = createManager();

		/** @type {Parameters<typeof manager.onChange<"numPref2">>[1]} */
		const changeFn = () => {};
		const spyFn = spy(changeFn);
		let callCount = 0;

		locations.global.loadPreferences({
			numPref2: 123,
		});
		assertSpyCalls(spyFn, callCount);

		manager.onChange("numPref2", spyFn);
		assertSpyCalls(spyFn, ++callCount);
		assertSpyCall(spyFn, callCount - 1, {
			args: [
				{
					value: 123,
					trigger: "initial",
					location: null,
				},
			],
		});

		locations.workspace.loadPreferences({
			numPref2: 456,
		});
		assertSpyCalls(spyFn, ++callCount);
		assertSpyCall(spyFn, callCount - 1, {
			args: [
				{
					value: 456,
					trigger: "load",
					location: "workspace",
				},
			],
		});

		manager.set("numPref2", 789, {location: "workspace"});
		assertSpyCalls(spyFn, ++callCount);
		assertSpyCall(spyFn, callCount - 1, {
			args: [
				{
					value: 789,
					trigger: "application",
					location: "workspace",
				},
			],
		});

		// Setting to an existing value should not fire any events
		manager.set("numPref2", 789, {location: "workspace"});
		assertSpyCalls(spyFn, callCount);

		// Setting a location with higher priority to an existing value should not fire any events
		manager.set("numPref2", 789, {location: "project"});
		manager.reset("numPref2", {location: "project"});
		assertSpyCalls(spyFn, callCount);

		// Setting a location with lower priority should not fire events
		manager.set("numPref2", 42, {location: "global"});
		manager.reset("numPref2", {location: "global"});
		manager.set("numPref2", 123, {location: "global"});
		assertSpyCalls(spyFn, callCount);

		// Resetting a location that was never set should not fire events
		manager.reset("numPref2", {location: "version-control"});

		manager.reset("numPref2", {location: "workspace"});
		assertSpyCalls(spyFn, ++callCount);
		assertSpyCall(spyFn, callCount - 1, {
			args: [
				{
					value: 123,
					trigger: "application",
					location: "workspace",
				},
			],
		});

		manager.set("numPref2", 789, {location: "workspace", performedByUser: true});
		assertSpyCalls(spyFn, ++callCount);
		assertSpyCall(spyFn, callCount - 1, {
			args: [
				{
					value: 789,
					trigger: "user",
					location: "workspace",
				},
			],
		});

		manager.reset("numPref2", {location: "workspace", performedByUser: true});
		assertSpyCalls(spyFn, ++callCount);
		assertSpyCall(spyFn, callCount - 1, {
			args: [
				{
					value: 123,
					trigger: "user",
					location: "workspace",
				},
			],
		});

		// When a location loads new values, it might reset ones that have not been specified.
		locations.global.loadPreferences({});
		assertSpyCalls(spyFn, ++callCount);
		assertSpyCall(spyFn, callCount - 1, {
			args: [
				{
					value: 42,
					trigger: "load",
					location: "global",
				},
			],
		});
	},
});