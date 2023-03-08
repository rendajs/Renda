import {assertEquals, assertThrows} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {ContentWindowPreferencesLocation} from "../../../../../studio/src/preferences/preferencesLocation/ContentWindowPreferencesLocation.js";
import {PreferencesLocation} from "../../../../../studio/src/preferences/preferencesLocation/PreferencesLocation.js";
import {PreferencesManager} from "../../../../../studio/src/preferences/PreferencesManager.js";
import {assertPromiseResolved} from "../../../shared/asserts.js";
import {assertIsType} from "../../../shared/typeAssertions.js";

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
	});

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

function createMockWindowManager() {
	const mockWindowManager = /** @type {import("../../../../../studio/src/windowManagement/WindowManager.js").WindowManager} */ ({
		requestContentWindowPreferencesFlush() {},
	});
	return mockWindowManager;
}

Deno.test({
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

		const boolResult = manager.get("boolPref");
		assertIsType(true, boolResult);
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType("", boolResult);

		const numResult = manager.get("numPref");
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
		});
		configTest("namespace.myPreference", {type: "number"}, {
			type: "number",
			uiName: "My Preference",
		});
		configTest("namespace.explicitName", {
			type: "string",
			uiName: "Hello",
		}, {
			type: "string",
			uiName: "Hello",
		});
		configTest("endswithdot.", {
			type: "string",
			uiName: "Hello",
		}, {
			type: "string",
			uiName: "Hello",
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

		const boolPref1 = manager.get("boolPref1");
		assertEquals(boolPref1, true);
		assertEquals(manager.get("boolPref2"), false);
		assertEquals(manager.get("numPref1"), 123);
		assertEquals(manager.get("numPref2"), 456);
		assertEquals(manager.get("projectPref"), "str");
		assertEquals(manager.get("workspacePref"), "str2");

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
		});
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

		// Unregistering should stop firing the callback
		manager.removeOnChange("numPref2", spyFn);
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
		const mockWindowManager = createMockWindowManager();
		const contentWindowLocation = new ContentWindowPreferencesLocation("contentwindow-project", mockWindowManager, "contentWindowLocation");
		manager.addLocation(contentWindowLocation);
		contentWindowLocation.loadPreferences({
			nonExistent: "foo",
		});

		const value = manager.get("nonExistent", {assertRegistered: false});
		assertEquals(value, "foo");

		// Verify that the type is `string | number | boolean | null` and nothing else
		const primitiveOrNull = /** @type {string | number | boolean | null} */ (null);
		assertIsType(primitiveOrNull, value);
		assertIsType(value, "");
		assertIsType(value, null);

		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType({}, value);

		assertThrows(() => {
			manager.get("nonExistent", {assertRegistered: true});
		});
		assertThrows(() => {
			manager.get("nonExistent");
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

		assertEquals(manager.get("str"), "global value");
		assertEquals(manager.get("str", {contentWindowUuid: "location1"}), "location1 value");
		assertEquals(manager.get("str", {contentWindowUuid: "location2"}), "location2 value");
		assertThrows(() => {
			manager.get("str", {contentWindowUuid: "non existent"});
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

		const str = manager.get("str", {contentWindowUuid: "location1"});

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

		const mockWindowManager = createMockWindowManager();
		const location1 = new ContentWindowPreferencesLocation("contentwindow-project", mockWindowManager, "location1");
		manager.addLocation(location1);
		const location2 = new ContentWindowPreferencesLocation("contentwindow-project", mockWindowManager, "location2");
		manager.addLocation(location2);
		location1.loadPreferences({
			str: "location1",
		});
		location2.loadPreferences({
			str: "location2",
		});

		/** @type {Parameters<typeof manager.onChange<"str">>[1]} */
		const onChangeCallbackSignature = () => {};
		const globalSpyFn = spy(onChangeCallbackSignature);
		let globalSpyFnCallCount = 0;
		const contentWindowSpyFn = spy(onChangeCallbackSignature);
		let contentWindowSpyFnCallCount = 0;

		// Register the global listener
		manager.onChange("str", globalSpyFn);
		assertSpyCalls(globalSpyFn, ++globalSpyFnCallCount);
		assertSpyCall(globalSpyFn, globalSpyFnCallCount - 1, {
			args: [
				{
					location: null,
					trigger: "initial",
					value: "",
				},
			],
		});

		// Register the content window listener
		manager.onChange("str", contentWindowSpyFn, {contentWindowUuid: "location1"});
		assertSpyCalls(contentWindowSpyFn, ++contentWindowSpyFnCallCount);
		assertSpyCall(contentWindowSpyFn, contentWindowSpyFnCallCount - 1, {
			args: [
				{
					location: null,
					trigger: "initial",
					value: "location1",
				},
			],
		});

		// Setting value from the content window, should only fire the content window listener
		manager.set("str", "location1set", {location: "contentwindow-project", contentWindowUuid: "location1"});
		assertSpyCalls(globalSpyFn, globalSpyFnCallCount);
		assertSpyCalls(contentWindowSpyFn, ++contentWindowSpyFnCallCount);
		assertSpyCall(contentWindowSpyFn, contentWindowSpyFnCallCount - 1, {
			args: [
				{
					location: "contentwindow-project",
					trigger: "application",
					value: "location1set",
				},
			],
		});

		// Setting it to the same value again, should not fire any listeners
		manager.set("str", "location1set", {location: "contentwindow-project", contentWindowUuid: "location1"});
		assertSpyCalls(globalSpyFn, globalSpyFnCallCount);
		assertSpyCalls(contentWindowSpyFn, contentWindowSpyFnCallCount);

		// Setting value from an unrelated content window should fire no events
		manager.set("str", "location2set", {location: "contentwindow-project", contentWindowUuid: "location2"});
		assertSpyCalls(globalSpyFn, globalSpyFnCallCount);
		assertSpyCalls(contentWindowSpyFn, contentWindowSpyFnCallCount);

		// Setting value globally shouldn't fire the content window events
		manager.set("str", "globalValueSet", {location: "global"});
		assertSpyCalls(contentWindowSpyFn, contentWindowSpyFnCallCount);
		assertSpyCalls(globalSpyFn, ++globalSpyFnCallCount);
		assertSpyCall(globalSpyFn, globalSpyFnCallCount - 1, {
			args: [
				{
					location: "global",
					trigger: "application",
					value: "globalValueSet",
				},
			],
		});

		// Resetting content window should fire with the global value
		manager.reset("str", {location: "contentwindow-project", contentWindowUuid: "location1"});
		assertSpyCalls(globalSpyFn, globalSpyFnCallCount);
		assertSpyCalls(contentWindowSpyFn, ++contentWindowSpyFnCallCount);
		assertSpyCall(contentWindowSpyFn, contentWindowSpyFnCallCount - 1, {
			args: [
				{
					location: "contentwindow-project",
					trigger: "application",
					value: "globalValueSet",
				},
			],
		});

		// Setting by user on content window should fire
		manager.set("str", "location1SetUser", {location: "contentwindow-project", contentWindowUuid: "location1", performedByUser: true});
		assertSpyCalls(globalSpyFn, globalSpyFnCallCount);
		assertSpyCalls(contentWindowSpyFn, ++contentWindowSpyFnCallCount);
		assertSpyCall(contentWindowSpyFn, contentWindowSpyFnCallCount - 1, {
			args: [
				{
					location: "contentwindow-project",
					trigger: "user",
					value: "location1SetUser",
				},
			],
		});

		// Removing the listeners still fires them when the incorrect or no uuid is provided
		manager.removeOnChange("str", contentWindowSpyFn);
		manager.set("str", "location1set1", {location: "contentwindow-project", contentWindowUuid: "location1"});
		assertSpyCalls(contentWindowSpyFn, ++contentWindowSpyFnCallCount);
		assertSpyCall(contentWindowSpyFn, contentWindowSpyFnCallCount - 1, {
			args: [
				{
					location: "contentwindow-project",
					trigger: "application",
					value: "location1set1",
				},
			],
		});
		manager.removeOnChange("str", contentWindowSpyFn, {contentWindowUuid: "wrong location"});
		manager.set("str", "location1set2", {location: "contentwindow-project", contentWindowUuid: "location1"});
		assertSpyCalls(contentWindowSpyFn, ++contentWindowSpyFnCallCount);
		assertSpyCall(contentWindowSpyFn, contentWindowSpyFnCallCount - 1, {
			args: [
				{
					location: "contentwindow-project",
					trigger: "application",
					value: "location1set2",
				},
			],
		});
		manager.removeOnChange("str", globalSpyFn, {contentWindowUuid: "location1"});
		manager.set("str", "globalValueSet2");
		assertSpyCalls(globalSpyFn, ++globalSpyFnCallCount);
		assertSpyCall(globalSpyFn, globalSpyFnCallCount - 1, {
			args: [
				{
					location: "global",
					trigger: "application",
					value: "globalValueSet2",
				},
			],
		});

		// Removing the listeners on the correct location should no longer fire them
		manager.removeOnChange("str", contentWindowSpyFn, {contentWindowUuid: "location1"});
		manager.set("str", "location1set3", {location: "contentwindow-project", contentWindowUuid: "location1"});
		assertSpyCalls(contentWindowSpyFn, contentWindowSpyFnCallCount);
		manager.removeOnChange("str", globalSpyFn);
		manager.set("str", "globalValueSet3");
		assertSpyCalls(globalSpyFn, globalSpyFnCallCount);
	},
});
