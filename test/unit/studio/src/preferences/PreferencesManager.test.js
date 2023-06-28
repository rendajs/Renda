import {assertEquals, assertThrows} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {ContentWindowPreferencesLocation} from "../../../../../studio/src/preferences/preferencesLocation/ContentWindowPreferencesLocation.js";
import {PreferencesLocation} from "../../../../../studio/src/preferences/preferencesLocation/PreferencesLocation.js";
import {PreferencesManager} from "../../../../../studio/src/preferences/PreferencesManager.js";
import {assertPromiseResolved} from "../../../shared/asserts.js";
import {assertIsType, testTypes} from "../../../shared/typeAssertions.js";

const DEFAULT_CONTENT_WINDOW_UUID = "default content window uuid";

/**
 * Takes a preference type and returns it as const.
 * This only exists to make autocompletions work.
 * @template {import("../../../../../studio/src/preferences/PreferencesManager.js").PreferenceConfig} T
 * @param {T} preference
 */
function pref(preference) {
	return preference;
}

/**
 * Creates a manager and registers a bunch of test types.
 * This ensures the manager has the correct generic type.
 */
function createManager() {
	const manager = new PreferencesManager({
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
		unknownPref1: pref({
			type: "unknown",
			default: {
				some: "data",
			},
		}),
		unknownPref2: pref({
			type: "unknown",
			default: [1, 2, 3],
		}),
	});

	const mockWindowManager = createMockWindowManager();

	const locations = {
		global: new PreferencesLocation("global"),
		workspace: new PreferencesLocation("workspace"),
		versionControl: new PreferencesLocation("version-control"),
		project: new PreferencesLocation("project"),
		contentWindowProject: new ContentWindowPreferencesLocation("contentwindow-project", mockWindowManager, DEFAULT_CONTENT_WINDOW_UUID),
	};
	for (const location of Object.values(locations)) {
		manager.addLocation(location);
	}

	return {manager, locations};
}

function createMockWindowManager() {
	const mockWindowManager = /** @type {import("../../../../../studio/src/windowManagement/WindowManager.js").WindowManager} */ ({
		requestContentWindowProjectPreferencesFlush() {},
	});
	return mockWindowManager;
}

testTypes({
	name: "Constructor registers preferences and infers the type",
	fn() {
		const manager = new PreferencesManager({
			boolPref: {
				type: "boolean",
			},
			numPref: {
				type: "number",
			},
		});

		const boolResult = manager.get("boolPref", "uuid");
		assertIsType(true, boolResult);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType("", boolResult);

		const numResult = manager.get("numPref", "uuid");
		assertIsType(0, numResult);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType("", numResult);
	},
});

Deno.test({
	name: "getting preference config",
	fn() {
		/**
		 * @param {string} preferenceName
		 * @param {import("../../../../../studio/src/preferences/PreferencesManager.js").PreferenceConfig} config
		 * @param {ReturnType<(typeof PreferencesManager)["prototype"]["getPreferenceConfig"]>} expectedResult
		 */
		function configTest(preferenceName, config, expectedResult) {
			const manager = new PreferencesManager();
			manager.registerPreference(preferenceName, config);
			assertEquals(manager.getPreferenceConfig(preferenceName), expectedResult);
		}

		configTest("pref", {type: "boolean"}, {
			type: "boolean",
			uiName: "Pref",
			allowedLocations: null,
		});
		configTest("namespace.myPreference", {type: "number"}, {
			type: "number",
			uiName: "My Preference",
			allowedLocations: null,
		});
		configTest("namespace.explicitName", {
			type: "string",
			uiName: "Hello",
		}, {
			type: "string",
			uiName: "Hello",
			allowedLocations: null,
		});
		configTest("endswithdot.", {
			type: "string",
			uiName: "Hello",
		}, {
			type: "string",
			uiName: "Hello",
			allowedLocations: null,
		});
		configTest("allowedLocations", {
			type: "string",
			allowedLocations: ["global"],
		}, {
			type: "string",
			uiName: "Allowed Locations",
			allowedLocations: ["global"],
		});

		const manager = new PreferencesManager();
		manager.registerPreference("endswithdot.", {
			type: "string",
		});
		assertThrows(() => {
			manager.getPreferenceConfig("endswithdot.");
		}, Error, "Preference UI name could not be determined.");
	},
});

Deno.test({
	name: "Registering preference with empty allowedLocations array throws",
	fn() {
		const manager = new PreferencesManager();
		assertThrows(() => {
			manager.registerPreference("thisThrows", {
				type: "string",
				allowedLocations: [],
			});
		}, Error, 'Preference "thisThrows" was registered with an empty allowedLocations array.');
	},
});

Deno.test({
	name: "Registering preference with defaultLocation that is not in the allowedLocations array throws",
	fn() {
		const manager = new PreferencesManager();
		assertThrows(() => {
			manager.registerPreference("thisThrows", {
				type: "string",
				allowedLocations: ["global"],
				defaultLocation: "project",
			});
		}, Error, 'Preference "thisThrows" was registered with "project" as default location but this location type was missing from the allowedLocation array.');

		assertThrows(() => {
			manager.registerPreference("thisThrowsToo", {
				type: "string",
				allowedLocations: ["project"],
			});
		}, Error, 'Preference "thisThrowsToo" was registered with "global" as default location but this location type was missing from the allowedLocation array.');
	},
});

Deno.test({
	name: "getPreferenceConfig() throws when not registered",
	fn() {
		const manager = new PreferencesManager();
		assertThrows(() => {
			manager.getPreferenceConfig("nonExistent");
		}, Error, 'Preference "nonExistent" has not been registered.');
	},
});

Deno.test({
	name: "Getting and setting preferences.",
	fn() {
		const {manager} = createManager();

		assertEquals(manager.get("boolPref1", DEFAULT_CONTENT_WINDOW_UUID), false);
		assertEquals(manager.get("boolPref2", DEFAULT_CONTENT_WINDOW_UUID), true);
		assertEquals(manager.get("numPref1", DEFAULT_CONTENT_WINDOW_UUID), 0);
		assertEquals(manager.get("numPref2", DEFAULT_CONTENT_WINDOW_UUID), 42);
		assertEquals(manager.get("projectPref", DEFAULT_CONTENT_WINDOW_UUID), "");
		assertEquals(manager.get("workspacePref", DEFAULT_CONTENT_WINDOW_UUID), "default");
		assertEquals(manager.get("unknownPref1", DEFAULT_CONTENT_WINDOW_UUID), {some: "data"});
		assertEquals(manager.get("unknownPref2", DEFAULT_CONTENT_WINDOW_UUID), [1, 2, 3]);

		manager.set("boolPref1", true);
		manager.set("boolPref2", false);
		manager.set("numPref1", 123);
		manager.set("numPref2", 456);
		manager.set("projectPref", "str");
		manager.set("workspacePref", "str2");
		manager.set("unknownPref1", {someOther: "data"});
		manager.set("unknownPref2", {not: "an array"});

		const boolPref1 = manager.get("boolPref1", DEFAULT_CONTENT_WINDOW_UUID);
		assertEquals(boolPref1, true);
		assertEquals(manager.get("boolPref2", DEFAULT_CONTENT_WINDOW_UUID), false);
		assertEquals(manager.get("numPref1", DEFAULT_CONTENT_WINDOW_UUID), 123);
		assertEquals(manager.get("numPref2", DEFAULT_CONTENT_WINDOW_UUID), 456);
		assertEquals(manager.get("projectPref", DEFAULT_CONTENT_WINDOW_UUID), "str");
		assertEquals(manager.get("workspacePref", DEFAULT_CONTENT_WINDOW_UUID), "str2");
		assertEquals(manager.get("unknownPref1", DEFAULT_CONTENT_WINDOW_UUID), {someOther: "data"});
		assertEquals(manager.get("unknownPref2", DEFAULT_CONTENT_WINDOW_UUID), {not: "an array"});

		// Verify that the type is a boolean and nothing else
		assertIsType(true, boolPref1);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType("", boolPref1);
	},
});

Deno.test({
	name: "Setting preferences at a specific location",
	fn() {
		const {manager} = createManager();

		assertEquals(manager.get("str", DEFAULT_CONTENT_WINDOW_UUID), "");
		manager.set("str", "global", {location: "global"});
		assertEquals(manager.get("str", DEFAULT_CONTENT_WINDOW_UUID), "global");

		manager.set("str", "project", {location: "project"});
		assertEquals(manager.get("str", DEFAULT_CONTENT_WINDOW_UUID), "project");

		manager.set("str", "workspace", {location: "workspace"});
		assertEquals(manager.get("str", DEFAULT_CONTENT_WINDOW_UUID), "project");

		manager.set("str", "version-control", {location: "version-control"});
		assertEquals(manager.get("str", DEFAULT_CONTENT_WINDOW_UUID), "project");

		manager.reset("str", {location: "project"});
		assertEquals(manager.get("str", DEFAULT_CONTENT_WINDOW_UUID), "version-control");

		manager.reset("str", {location: "workspace"});
		assertEquals(manager.get("str", DEFAULT_CONTENT_WINDOW_UUID), "version-control");

		manager.reset("str", {location: "version-control"});
		assertEquals(manager.get("str", DEFAULT_CONTENT_WINDOW_UUID), "global");

		manager.reset("str", {location: "global"});
		assertEquals(manager.get("str", DEFAULT_CONTENT_WINDOW_UUID), "");
	},
});

Deno.test({
	name: "Getting preferences at a specific location",
	fn() {
		const {manager} = createManager();

		// Get default value when no location is provided
		assertEquals(manager.getUiValueAtLocation("str", null), "");
		assertEquals(manager.getUiValueAtLocation("boolPref1", null), false);
		assertEquals(manager.getUiValueAtLocation("boolPref2", null), true);
		assertEquals(manager.getUiValueAtLocation("numPref1", null), 0);
		assertEquals(manager.getUiValueAtLocation("numPref2", null), 42);
		assertEquals(manager.getUiValueAtLocation("workspacePref", null), "default");
		assertEquals(manager.getUiValueAtLocation("unknownPref1", null), {some: "data"});
		assertEquals(manager.getUiValueAtLocation("unknownPref2", null), [1, 2, 3]);

		assertEquals(manager.getUiValueAtLocation("str", "global"), null);
		manager.set("str", "global", {location: "global"});
		assertEquals(manager.getUiValueAtLocation("str", "global"), "global");
		assertEquals(manager.getUiValueAtLocation("str", "project"), null);

		manager.set("str", "project", {location: "project"});
		assertEquals(manager.getUiValueAtLocation("str", "project"), "project");

		assertEquals(manager.getUiValueAtLocation("workspacePref", "global"), null);
		assertEquals(manager.getUiValueAtLocation("workspacePref", null), "default");
		manager.set("workspacePref", "workspace", {location: "workspace"});
		assertEquals(manager.getUiValueAtLocation("workspacePref", "global"), null);
		assertEquals(manager.getUiValueAtLocation("workspacePref", null), "workspace");

		assertThrows(() => {
			manager.getUiValueAtLocation("nonexistent", null);
		}, Error, 'The preference "nonexistent" has not been registered.');

		const mockWindowManager = createMockWindowManager();
		const location1 = new ContentWindowPreferencesLocation("contentwindow-project", mockWindowManager, "location1");
		manager.addLocation(location1);
		const location2 = new ContentWindowPreferencesLocation("contentwindow-project", mockWindowManager, "location2");
		manager.addLocation(location2);

		manager.set("str", "location1 value", {
			location: "contentwindow-project",
			contentWindowUuid: "location1",
		});
		manager.set("str", "location2 value", {
			location: "contentwindow-project",
			contentWindowUuid: "location2",
		});

		assertEquals(manager.getUiValueAtLocation("str", "contentwindow-project", {contentWindowUuid: "location1"}), "location1 value");
		assertEquals(manager.getUiValueAtLocation("str", "contentwindow-project", {contentWindowUuid: "location2"}), "location2 value");
		assertThrows(() => {
			manager.getUiValueAtLocation("str", "contentwindow-project", {contentWindowUuid: "nonexistent"});
		}, Error, 'A content window uuid was provided ("nonexistent") but no location for this uuid was found.');
	},
});

Deno.test({
	name: "Getting the default location with a global location registered gives a helpful error message",
	fn() {
		const preferencesManager = new PreferencesManager({
			pref: {
				type: "string",
			},
		});
		const mockWindowManager = createMockWindowManager();
		const windowLocation = new ContentWindowPreferencesLocation("contentwindow-project", mockWindowManager, DEFAULT_CONTENT_WINDOW_UUID);
		preferencesManager.addLocation(windowLocation);

		assertThrows(() => {
			preferencesManager.getUiValueAtLocation("pref", null, {
				contentWindowUuid: DEFAULT_CONTENT_WINDOW_UUID,
			});
		}, Error, '"global" preference location was not found.');
	},
});

Deno.test({
	name: "Setting at missing location throws",
	fn() {
		const {manager, locations} = createManager();

		assertThrows(() => {
			manager.set("str", "value", {location: "contentwindow-project"});
		}, Error, '"contentwindow-project" preference location was not found.');

		manager.removeLocation(locations.global);
		assertThrows(() => {
			manager.set("str", "value", {location: "global"});
		}, Error, '"global" preference location was not found.');
	},
});

Deno.test({
	name: "Setting at a location that is not in the allowlist throws",
	fn() {
		const manager = new PreferencesManager({
			pref1: pref({
				type: "string",
				allowedLocations: ["global"],
			}),
		});

		manager.addLocation(new PreferencesLocation("global"));
		manager.addLocation(new PreferencesLocation("workspace"));

		/** @type {Parameters<typeof manager.onChangeAny>[0]} */
		const changeFn = () => {};
		const spyFn = spy(changeFn);
		let callCount = 0;
		manager.onChangeAny(spyFn);

		manager.set("pref1", "globalValue1", {location: "global"});
		assertSpyCalls(spyFn, ++callCount);

		assertThrows(() => {
			manager.set("pref1", "workspaceValue1", {location: "workspace"});
		}, Error, '"workspace" is not an allowed location for this preference.');

		manager.set("pref1", "globalValue2", {location: "global"});
		assertSpyCalls(spyFn, ++callCount);
	},
});

Deno.test({
	name: "Getting ignores locations that are not in the allowlist",
	fn() {
		// We need to make sure values from disallowed locations are not accidentally loaded.
		// Some preferences rely on `allowedLocation` as a security measure.
		// Without this check, an attacker could share a project or workspace with insecure values for instance.
		const manager = new PreferencesManager({
			pref1: pref({
				type: "string",
				allowedLocations: ["global"],
				default: "default",
			}),
		});

		manager.addLocation(new PreferencesLocation("global"));
		const workspaceLocation = new PreferencesLocation("workspace");
		manager.addLocation(workspaceLocation);
		workspaceLocation.loadPreferences({
			pref1: "insecure value",
		});

		const mockWindowManager = createMockWindowManager();
		const windowLocation = new ContentWindowPreferencesLocation("contentwindow-project", mockWindowManager, DEFAULT_CONTENT_WINDOW_UUID);
		manager.addLocation(windowLocation);
		windowLocation.loadPreferences({
			pref1: "another insecure value",
		});

		const value1 = manager.get("pref1", DEFAULT_CONTENT_WINDOW_UUID);
		assertEquals(value1, "default");

		const value1Global = manager.getUiValueAtLocation("pref1", "global");
		assertEquals(value1Global, null);
		const value1Workspace = manager.getUiValueAtLocation("pref1", "workspace");
		assertEquals(value1Workspace, null);
		const value1Window = manager.getUiValueAtLocation("pref1", "contentwindow-project", {contentWindowUuid: DEFAULT_CONTENT_WINDOW_UUID});
		assertEquals(value1Window, null);

		// Resetting locations that are not in the allowlist is fine, they were already not getting used anyway
		manager.reset("pref1", {contentWindowUuid: DEFAULT_CONTENT_WINDOW_UUID, location: "contentwindow-project"});
		manager.reset("pref1", {location: "workspace"});
		manager.reset("pref1", {location: "global"});
	},
});

Deno.test({
	name: "All locations are considered when getting a value",
	fn() {
		const {manager} = createManager();

		manager.set("projectPref", "global", {location: "global"});
		manager.set("projectPref", "project");
		assertEquals(manager.get("projectPref", DEFAULT_CONTENT_WINDOW_UUID), "project");
	},
});

Deno.test({
	name: "Events are fired for changed preferences",
	fn() {
		const {manager, locations} = createManager();

		/** @type {Parameters<typeof manager.onChangeAny>[0]} */
		const changeFn = () => {};
		const spyFn = spy(changeFn);
		let callCount = 0;

		locations.global.loadPreferences({
			numPref2: 123,
		});
		assertSpyCalls(spyFn, callCount);

		manager.onChangeAny(spyFn);

		locations.workspace.loadPreferences({
			numPref2: 456,
		});
		assertSpyCalls(spyFn, ++callCount);
		assertSpyCall(spyFn, callCount - 1, {
			args: [
				{
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
					trigger: "application",
					location: "workspace",
				},
			],
		});

		// Setting to an existing value should fire it again
		manager.set("numPref2", 789, {location: "workspace"});
		assertSpyCalls(spyFn, ++callCount);
		assertSpyCall(spyFn, callCount - 1, {
			args: [
				{
					trigger: "application",
					location: "workspace",
				},
			],
		});

		// Setting a location with higher priority to an existing value should fire events
		manager.set("numPref2", 789, {location: "project"});
		assertSpyCalls(spyFn, ++callCount);
		assertSpyCall(spyFn, callCount - 1, {
			args: [
				{
					trigger: "application",
					location: "project",
				},
			],
		});
		manager.reset("numPref2", {location: "project"});
		assertSpyCalls(spyFn, ++callCount);
		assertSpyCall(spyFn, callCount - 1, {
			args: [
				{
					trigger: "application",
					location: "project",
				},
			],
		});

		// Setting a location with lower priority should fire events
		manager.set("numPref2", 42, {location: "global"});
		manager.reset("numPref2", {location: "global"});
		manager.set("numPref2", 123, {location: "global"});
		callCount += 3;
		assertSpyCalls(spyFn, callCount);

		// Resetting a location that was never set should not fire events
		manager.reset("numPref2", {location: "version-control"});
		assertSpyCalls(spyFn, ++callCount);

		manager.reset("numPref2", {location: "workspace"});
		assertSpyCalls(spyFn, ++callCount);
		assertSpyCall(spyFn, callCount - 1, {
			args: [
				{
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
					trigger: "load",
					location: "global",
				},
			],
		});

		// Unregistering should stop firing the callback
		manager.removeOnChangeAny(spyFn);
		manager.set("numPref2", 789, {location: "workspace"});
		assertSpyCalls(spyFn, callCount);
	},
});

Deno.test({
	name: "Values are immediately flushed by default",
	fn() {
		const {manager, locations} = createManager();
		const flushSpy = spy(locations.global, "flush");

		manager.set("boolPref1", true);
		assertSpyCalls(flushSpy, 1);

		manager.reset("boolPref1");
		assertSpyCalls(flushSpy, 2);
	},
});

Deno.test({
	name: "Calling flush flushes unflushed locations",
	async fn() {
		const {manager, locations} = createManager();
		/** @type {Set<() => void>} */
		const globalFlushResolveFunctions = new Set();
		const globalFlushSpy = stub(locations.global, "flush", () => {
			return new Promise(resolve => {
				globalFlushResolveFunctions.add(resolve);
			});
		});
		const workspaceFlushSpy = spy(locations.workspace, "flush");
		const versionControlFlushSpy = spy(locations.versionControl, "flush");
		const projectFlushSpy = spy(locations.project, "flush");

		// don't flush global location
		manager.set("boolPref1", true, {
			flush: false,
		});

		// don't flush project location
		manager.set("projectPref", "value", {
			flush: false,
		});

		// flush workspace location
		manager.set("workspacePref", "value");

		// don't set versionControl location at all

		assertSpyCalls(globalFlushSpy, 0);
		assertSpyCalls(projectFlushSpy, 0);
		assertSpyCalls(workspaceFlushSpy, 1);
		assertSpyCalls(versionControlFlushSpy, 0);

		// Now flush all locations that have not been flushed yet
		const flushPromise = manager.flush();

		await assertPromiseResolved(flushPromise, false);

		globalFlushResolveFunctions.forEach(cb => cb());
		globalFlushResolveFunctions.clear();

		await assertPromiseResolved(flushPromise, true);

		assertSpyCalls(globalFlushSpy, 1);
		assertSpyCalls(projectFlushSpy, 1);
		assertSpyCalls(workspaceFlushSpy, 1);
		assertSpyCalls(versionControlFlushSpy, 0);
	},
});

Deno.test({
	name: "Using preferences that have not been registered",
	fn() {
		const {manager, locations} = createManager();

		// Loading non existent preferences should be ignored silently.
		// Otherwise a deprecated or removed preference in a preferences file on disk
		// would prevent studio from loading entirely.
		locations.global.loadPreferences({
			nonExistent: "foo",
		});

		// Same for preferences in content window locations
		locations.contentWindowProject.loadPreferences({
			nonExistent: "foo",
		});

		// But trying to get the value should still throw, we want to make sure we are aware of a desired
		// default value and allowed locations.
		// For example, if a preference is only allowed to be stored in some locations as a security measure,
		// but the preference hasn't (yet) been registered for whatever reason, not throwing would actually
		// lower the security.
		assertThrows(() => {
			manager.get("nonExistent", DEFAULT_CONTENT_WINDOW_UUID);
		});
	},
});

Deno.test({
	name: "Getting and setting for a specific content window",
	fn() {
		const {manager} = createManager();

		const mockWindowManager = createMockWindowManager();

		const location1 = new ContentWindowPreferencesLocation("contentwindow-project", mockWindowManager, "location1");
		manager.addLocation(location1);
		const location2 = new ContentWindowPreferencesLocation("contentwindow-project", mockWindowManager, "location2");
		manager.addLocation(location2);

		manager.set("str", "global value", {location: "global"});
		manager.set("str", "location1 value", {
			location: "contentwindow-project",
			contentWindowUuid: "location1",
		});
		manager.set("str", "location2 value", {
			location: "contentwindow-project",
			contentWindowUuid: "location2",
		});

		assertEquals(manager.get("str", "location1"), "location1 value");
		assertEquals(manager.get("str", "location2"), "location2 value");
		assertThrows(() => {
			manager.get("str", "non existent");
		}, Error, 'A content window uuid was provided ("non existent") but no location for this uuid was found.');

		assertThrows(() => {
			manager.set("str", "missing location uuid", {
				location: "contentwindow-project",
			});
		}, Error, '"contentwindow-project" preference location was not found.');

		assertThrows(() => {
			manager.set("str", "value", {
				location: "contentwindow-project",
				contentWindowUuid: "non existent uuid",
			});
		}, Error, 'A content window uuid was provided ("non existent uuid") but no location for this uuid was found.');

		const str = manager.get("str", "location1");

		// Verify that the type is a string and nothing else
		assertIsType("", str);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(true, str);
	},
});

Deno.test({
	name: "Events fire for specific content windows",
	fn() {
		const {manager} = createManager();

		const CONTENT_WINDOW_UUID_1 = "content window uuid 1";
		const CONTENT_WINDOW_UUID_2 = "content window uuid 2";

		const mockWindowManager = createMockWindowManager();
		const location1 = new ContentWindowPreferencesLocation("contentwindow-project", mockWindowManager, CONTENT_WINDOW_UUID_1);
		manager.addLocation(location1);
		const location2 = new ContentWindowPreferencesLocation("contentwindow-project", mockWindowManager, CONTENT_WINDOW_UUID_2);
		manager.addLocation(location2);

		/** @type {Parameters<typeof manager.onChangeAny>[0]} */
		const onChangeAnyCallbackSignature = () => {};
		const globalSpyFn = spy(onChangeAnyCallbackSignature);
		let globalSpyFnCallCount = 0;

		/** @type {Parameters<typeof manager.onChange<"str">>[2]} */
		const onChangeCallbackSignature = () => {};
		const contentWindowSpyFn1 = spy(onChangeCallbackSignature);
		let contentWindowSpyFn1CallCount = 0;
		const contentWindowSpyFn2 = spy(onChangeCallbackSignature);
		let contentWindowSpyFn2CallCount = 0;

		// Register the global listener
		manager.onChangeAny(globalSpyFn);
		assertSpyCalls(globalSpyFn, globalSpyFnCallCount);

		// Set globally to initialize the value
		manager.set("str", "globalValue", {location: "global"});
		assertSpyCalls(globalSpyFn, ++globalSpyFnCallCount);
		assertSpyCall(globalSpyFn, globalSpyFnCallCount - 1, {
			args: [
				{
					location: "global",
					trigger: "application",
				},
			],
		});

		// Register the content window listeners, events fire with 'initial' and 'location: null'
		manager.onChange("str", CONTENT_WINDOW_UUID_1, contentWindowSpyFn1);
		assertSpyCalls(contentWindowSpyFn1, ++contentWindowSpyFn1CallCount);
		assertSpyCall(contentWindowSpyFn1, contentWindowSpyFn1CallCount - 1, {
			args: [
				{
					location: null,
					trigger: "initial",
					value: "globalValue",
				},
			],
		});
		manager.onChange("str", CONTENT_WINDOW_UUID_2, contentWindowSpyFn2);
		assertSpyCalls(contentWindowSpyFn2, ++contentWindowSpyFn2CallCount);
		assertSpyCall(contentWindowSpyFn2, contentWindowSpyFn2CallCount - 1, {
			args: [
				{
					location: null,
					trigger: "initial",
					value: "globalValue",
				},
			],
		});

		// Load preferences, this should fire both global and content window events
		location1.loadPreferences({
			str: "location1",
		});
		assertSpyCalls(globalSpyFn, ++globalSpyFnCallCount);
		assertSpyCall(globalSpyFn, globalSpyFnCallCount - 1, {
			args: [
				{
					location: "contentwindow-project",
					trigger: "load",
				},
			],
		});

		location2.loadPreferences({
			str: "location2",
		});
		assertSpyCalls(globalSpyFn, ++globalSpyFnCallCount);
		assertSpyCall(globalSpyFn, globalSpyFnCallCount - 1, {
			args: [
				{
					location: "contentwindow-project",
					trigger: "load",
				},
			],
		});

		assertSpyCalls(contentWindowSpyFn1, ++contentWindowSpyFn1CallCount);
		assertSpyCall(contentWindowSpyFn1, contentWindowSpyFn1CallCount - 1, {
			args: [
				{
					location: "contentwindow-project",
					trigger: "load",
					value: "location1",
				},
			],
		});
		assertSpyCalls(contentWindowSpyFn2, ++contentWindowSpyFn2CallCount);
		assertSpyCall(contentWindowSpyFn2, contentWindowSpyFn2CallCount - 1, {
			args: [
				{
					location: "contentwindow-project",
					trigger: "load",
					value: "location2",
				},
			],
		});

		// Setting value from the content window, should fire the content window listener and global listener
		manager.set("str", "location1set", {location: "contentwindow-project", contentWindowUuid: CONTENT_WINDOW_UUID_1});
		assertSpyCalls(globalSpyFn, ++globalSpyFnCallCount);
		assertSpyCall(globalSpyFn, globalSpyFnCallCount - 1, {
			args: [
				{
					location: "contentwindow-project",
					trigger: "application",
				},
			],
		});
		assertSpyCalls(contentWindowSpyFn1, ++contentWindowSpyFn1CallCount);
		assertSpyCall(contentWindowSpyFn1, contentWindowSpyFn1CallCount - 1, {
			args: [
				{
					location: "contentwindow-project",
					trigger: "application",
					value: "location1set",
				},
			],
		});
		assertSpyCalls(contentWindowSpyFn2, contentWindowSpyFn2CallCount);

		// Setting it to the same value again, should only fire the global listener
		manager.set("str", "location1set", {location: "contentwindow-project", contentWindowUuid: CONTENT_WINDOW_UUID_1});
		assertSpyCalls(globalSpyFn, ++globalSpyFnCallCount);
		assertSpyCall(globalSpyFn, globalSpyFnCallCount - 1, {
			args: [
				{
					location: "contentwindow-project",
					trigger: "application",
				},
			],
		});
		assertSpyCalls(contentWindowSpyFn1, contentWindowSpyFn1CallCount);
		assertSpyCalls(contentWindowSpyFn2, contentWindowSpyFn2CallCount);

		// Setting value from another content window should only fire events on that content window
		manager.set("str", "location2set", {location: "contentwindow-project", contentWindowUuid: CONTENT_WINDOW_UUID_2});
		assertSpyCalls(globalSpyFn, ++globalSpyFnCallCount);
		assertSpyCall(globalSpyFn, globalSpyFnCallCount - 1, {
			args: [
				{
					location: "contentwindow-project",
					trigger: "application",
				},
			],
		});
		assertSpyCalls(contentWindowSpyFn1, contentWindowSpyFn1CallCount);
		assertSpyCalls(contentWindowSpyFn2, ++contentWindowSpyFn2CallCount);
		assertSpyCall(contentWindowSpyFn2, contentWindowSpyFn2CallCount - 1, {
			args: [
				{
					location: "contentwindow-project",
					trigger: "application",
					value: "location2set",
				},
			],
		});

		// Setting value globally shouldn't fire the content window events
		manager.set("str", "globalValueSet", {location: "global"});
		assertSpyCalls(contentWindowSpyFn1, contentWindowSpyFn1CallCount);
		assertSpyCalls(contentWindowSpyFn2, contentWindowSpyFn2CallCount);
		assertSpyCalls(globalSpyFn, ++globalSpyFnCallCount);
		assertSpyCall(globalSpyFn, globalSpyFnCallCount - 1, {
			args: [
				{
					location: "global",
					trigger: "application",
				},
			],
		});

		// Resetting content window should fire with the global value
		manager.reset("str", {location: "contentwindow-project", contentWindowUuid: CONTENT_WINDOW_UUID_1});
		assertSpyCalls(globalSpyFn, ++globalSpyFnCallCount);
		assertSpyCall(globalSpyFn, globalSpyFnCallCount - 1, {
			args: [
				{
					location: "contentwindow-project",
					trigger: "application",
				},
			],
		});
		assertSpyCalls(contentWindowSpyFn1, ++contentWindowSpyFn1CallCount);
		assertSpyCall(contentWindowSpyFn1, contentWindowSpyFn1CallCount - 1, {
			args: [
				{
					location: "contentwindow-project",
					trigger: "application",
					value: "globalValueSet",
				},
			],
		});
		assertSpyCalls(contentWindowSpyFn2, contentWindowSpyFn2CallCount);

		// Setting value globally should only fire on content windows that don't already have their own location set
		// At this point location1 has been reset, while location2 still has a value
		manager.set("str", "globalValueSet again", {location: "global"});
		assertSpyCalls(globalSpyFn, ++globalSpyFnCallCount);
		assertSpyCall(globalSpyFn, globalSpyFnCallCount - 1, {
			args: [
				{
					location: "global",
					trigger: "application",
				},
			],
		});
		assertSpyCalls(contentWindowSpyFn1, ++contentWindowSpyFn1CallCount);
		assertSpyCall(contentWindowSpyFn1, contentWindowSpyFn1CallCount - 1, {
			args: [
				{
					location: "global",
					trigger: "application",
					value: "globalValueSet again",
				},
			],
		});
		assertSpyCalls(contentWindowSpyFn2, contentWindowSpyFn2CallCount);

		// Setting by user on content window should fire
		manager.set("str", "location1SetUser", {location: "contentwindow-project", contentWindowUuid: CONTENT_WINDOW_UUID_1, performedByUser: true});
		assertSpyCalls(globalSpyFn, ++globalSpyFnCallCount);
		assertSpyCall(globalSpyFn, globalSpyFnCallCount - 1, {
			args: [
				{
					location: "contentwindow-project",
					trigger: "user",
				},
			],
		});
		assertSpyCalls(contentWindowSpyFn1, ++contentWindowSpyFn1CallCount);
		assertSpyCall(contentWindowSpyFn1, contentWindowSpyFn1CallCount - 1, {
			args: [
				{
					location: "contentwindow-project",
					trigger: "user",
					value: "location1SetUser",
				},
			],
		});
		assertSpyCalls(contentWindowSpyFn2, contentWindowSpyFn2CallCount);

		// Removing the listeners still fires them when the incorrect uuid is provided
		manager.removeOnChange("str", "wrong location", contentWindowSpyFn1);
		manager.set("str", "location1set2", {location: "contentwindow-project", contentWindowUuid: CONTENT_WINDOW_UUID_1});
		assertSpyCalls(globalSpyFn, ++globalSpyFnCallCount);
		assertSpyCalls(contentWindowSpyFn1, ++contentWindowSpyFn1CallCount);
		assertSpyCall(contentWindowSpyFn1, contentWindowSpyFn1CallCount - 1, {
			args: [
				{
					location: "contentwindow-project",
					trigger: "application",
					value: "location1set2",
				},
			],
		});

		// Removing the listeners on the correct location should no longer fire them
		manager.removeOnChange("str", CONTENT_WINDOW_UUID_1, contentWindowSpyFn1);
		manager.set("str", "location1set3", {location: "contentwindow-project", contentWindowUuid: CONTENT_WINDOW_UUID_1});
		assertSpyCalls(contentWindowSpyFn1, contentWindowSpyFn1CallCount);
		assertSpyCalls(globalSpyFn, ++globalSpyFnCallCount);
		manager.removeOnChangeAny(globalSpyFn);
		manager.set("str", "globalValueSet3");
		assertSpyCalls(globalSpyFn, globalSpyFnCallCount);
	},
});

Deno.test({
	name: "load event doesn't fire on content windows when the value hasn't changed",
	fn() {
		const {manager} = createManager();

		const CONTENT_WINDOW_UUID = "content window uuid";

		const mockWindowManager = createMockWindowManager();
		const location = new ContentWindowPreferencesLocation("contentwindow-project", mockWindowManager, CONTENT_WINDOW_UUID);
		manager.addLocation(location);

		/** @type {Parameters<typeof manager.onChange<"str">>[2]} */
		const onChangeCallbackSignature = () => {};
		const contentWindowSpyFn = spy(onChangeCallbackSignature);

		manager.set("str", "existing value", {location: "global"});

		// Register the content window listeners, events fire with 'initial' and 'location: null'
		manager.onChange("str", CONTENT_WINDOW_UUID, contentWindowSpyFn);
		assertSpyCalls(contentWindowSpyFn, 1);
		assertSpyCall(contentWindowSpyFn, 0, {
			args: [
				{
					location: null,
					trigger: "initial",
					value: "existing value",
				},
			],
		});

		// Load preferences, this shouldn't fire events because the value is the same
		location.loadPreferences({
			str: "existing value",
		});
		assertSpyCalls(contentWindowSpyFn, 1);
	},
});
