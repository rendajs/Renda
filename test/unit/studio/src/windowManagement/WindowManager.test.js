import {Importer} from "fake-imports";
import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {assert, assertEquals, assertInstanceOf, assertStrictEquals, assertThrows} from "std/testing/asserts.ts";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {MouseEvent} from "fake-dom/FakeMouseEvent.js";
import {injectMockStudioInstance} from "../../../../../studio/src/studioInstance.js";
import {PreferencesManager} from "../../../../../studio/src/preferences/PreferencesManager.js";
import {PreferencesLocation} from "../../../../../studio/src/preferences/preferencesLocation/PreferencesLocation.js";
import {assertPromiseResolved} from "../../../shared/asserts.js";
import {assertIsType} from "../../../shared/typeAssertions.js";
import {createMockPopoverManager, triggerContextMenuItem} from "../../shared/contextMenuHelpers.js";
import {waitForMicrotasks} from "../../../shared/waitForMicroTasks.js";
import {WorkspacePreferencesLocation} from "../../../../../studio/src/preferences/preferencesLocation/WorkspacePreferencesLocation.js";

const importer = new Importer(import.meta.url);
importer.redirectModule("../../../../../src/util/IndexedDbUtil.js", "../../shared/MockIndexedDbUtil.js");
importer.makeReal("../../../../../studio/src/studioInstance.js");
importer.makeReal("../../../../../src/mod.js");
importer.makeReal("../../../../../src/util/mod.js");
importer.makeReal("../../../../../studio/src/preferences/preferencesLocation/ContentWindowPreferencesLocation.js");
importer.makeReal("../../../../../studio/src/windowManagement/PreferencesPopover.js");
importer.makeReal("../../../../../studio/src/preferences/preferencesLocation/WorkspacePreferencesLocation.js");

/** @type {import("../../../../../studio/src/windowManagement/WindowManager.js")} */
const WindowManagerMod = await importer.import("../../../../../studio/src/windowManagement/WindowManager.js");
const {WindowManager} = WindowManagerMod;

/** @type {import("../../../../../studio/src/windowManagement/StudioWindow.js")} */
const StudioWindowMod = await importer.import("../../../../../studio/src/windowManagement/StudioWindow.js");
const {StudioWindow} = StudioWindowMod;
const onFocusedWithinChangeSym = Symbol("onFocusedWithinChange");

/** @typedef {import("../../../../../studio/src/windowManagement/StudioWindow.js").StudioWindow & {[onFocusedWithinChangeSym]: Set<(hasFocus: boolean) => void>}} StudioWindowWithSym */
// https://github.com/microsoft/TypeScript/issues/47259#issuecomment-1317399906:
// eslint-disable-next-line no-unused-expressions
() => {};

stub(StudioWindow.prototype, "onFocusedWithinChange", function(cb) {
	// eslint-disable-next-line no-invalid-this
	const castThis = /** @type {StudioWindowWithSym} */ (this);
	if (!castThis[onFocusedWithinChangeSym]) {
		castThis[onFocusedWithinChangeSym] = new Set();
	}
	castThis[onFocusedWithinChangeSym].add(cb);
});

/**
 * @param {import("../../../../../studio/src/windowManagement/StudioWindow.js").StudioWindow} studioWindow
 */
function triggerOnFocusedWithinChange(studioWindow) {
	const castWindow = /** @type {StudioWindowWithSym} */ (/** @type {unknown} */ (studioWindow));
	castWindow[onFocusedWithinChangeSym].forEach(cb => cb(true));
}

/** @type {import("../../../../../studio/src/windowManagement/SplitStudioWindow.js")} */
const StudioWindowSplitMod = await importer.import("../../../../../studio/src/windowManagement/SplitStudioWindow.js");
const {SplitStudioWindow} = StudioWindowSplitMod;

/** @type {import("../../../../../studio/src/windowManagement/TabsStudioWindow.js")} */
const StudioWindowTabsMod = await importer.import("../../../../../studio/src/windowManagement/TabsStudioWindow.js");
const {TabsStudioWindow} = StudioWindowTabsMod;
stub(TabsStudioWindow.prototype, "updateTabSelectorSpacer", () => {});

/** @type {import("../../../../../studio/src/windowManagement/contentWindows/ContentWindow.js")} */
const ContentWindowMod = await importer.import("../../../../../studio/src/windowManagement/contentWindows/ContentWindow.js");
const {ContentWindow} = ContentWindowMod;

const CONTENT_WINDOW_UUID_1 = "uuid1";
const CONTENT_WINDOW_UUID_2 = "uuid2";
const CONTENT_WINDOW_UUID_3 = "uuid3";
const CONTENT_WINDOW_UUID_4 = "uuid4";
const CONTENT_WINDOW_TYPE_1 = "namespace:content window type 1";
const CONTENT_WINDOW_TYPE_2 = "namespace:content window type 2";
const CONTENT_WINDOW_TYPE_3 = "namespace:content window type 3";
const CONTENT_WINDOW_TYPE_4 = "namespace:content window type 4";

/** @type {import("../../../../../studio/src/windowManagement/WorkspaceManager.js")} */
const WorkspaceManagerMod = await importer.import("../../../../../studio/src/windowManagement/WorkspaceManager.js");
const {WorkspaceManager} = WorkspaceManagerMod;

/**
 * @typedef {[name: string, value: string | boolean][]} SetValueCalls
 */

function pref() {
	/** @type {import("../../../../../studio/src/preferences/PreferencesManager.js").PreferenceConfig} */
	const pref = {
		type: "string",
		default: "",
	};
	return pref;
}

const autoRegisterPreferences = /** @type {const} */ ({
	pref1: pref(),
	pref2: pref(),
	pref3: pref(),
});

/**
 * @typedef WindowManagerTestContext
 * @property {import("../../../../../studio/src/windowManagement/WindowManager.js").WindowManager} windowManager
 * @property {SetValueCalls} shortcutConditionSetValueCalls
 * @property {import("../../../../../studio/src/Studio.js").Studio} studio
 * @property {PreferencesManager<typeof autoRegisterPreferences>} preferencesManager
 */

/**
 * @param {object} options
 * @param {(studio: import("../../../../../studio/src/Studio.js").Studio) => void} [options.beforeCreate]
 * @param {import("../../../../../studio/src/windowManagement/WorkspaceManager.js").WorkspaceData} [options.getActiveWorkspaceDataReturn]
 */
async function basicSetup({
	beforeCreate,
	getActiveWorkspaceDataReturn = {
		rootWindow: {
			type: "split",
			splitHorizontal: true,
			splitPercentage: 0.5,
			windowA: {
				type: "tabs",
				tabTypes: [CONTENT_WINDOW_TYPE_1, CONTENT_WINDOW_TYPE_2],
				tabUuids: [CONTENT_WINDOW_UUID_1, CONTENT_WINDOW_UUID_2],
				activeTabIndex: 0,
			},
			windowB: {
				type: "tabs",
				tabTypes: [CONTENT_WINDOW_TYPE_2, CONTENT_WINDOW_TYPE_3],
				tabUuids: [CONTENT_WINDOW_UUID_3, CONTENT_WINDOW_UUID_4],
				activeTabIndex: 0,
			},
		},
	},
} = {}) {
	installFakeDocument();

	const getActiveWorkspaceDataSpy = stub(WorkspaceManager.prototype, "getActiveWorkspaceData", async () => {
		return getActiveWorkspaceDataReturn;
	});

	/** @type {SetValueCalls} */
	const shortcutConditionSetValueCalls = [];

	/** @type {PreferencesManager<typeof autoRegisterPreferences>} */
	const mockPreferencesManager = new PreferencesManager();
	mockPreferencesManager.registerPreferences(autoRegisterPreferences);
	const globalPreferencesLocation = new PreferencesLocation("global");
	mockPreferencesManager.addLocation(globalPreferencesLocation);

	const mockStudio = /** @type {import("../../../../../studio/src/Studio.js").Studio} */ ({
		keyboardShortcutManager: {
			getCondition(name) {
				return {
					requestValueSetter() {
						return {
							/**
							 * @param {string | boolean} value
							 */
							setValue(value) {
								shortcutConditionSetValueCalls.push([name, value]);
							},
						};
					},
				};
			},
		},
		preferencesManager: /** @type {PreferencesManager<any>} */ (mockPreferencesManager),
	});
	injectMockStudioInstance(mockStudio);

	function cleanup() {
		uninstallFakeDocument();
		injectMockStudioInstance(null);
		getActiveWorkspaceDataSpy.restore();
	}

	if (beforeCreate) beforeCreate(mockStudio);
	const windowManager = new WindowManager();
	class ContentWindowTab1 extends ContentWindow {
		static contentWindowTypeId = CONTENT_WINDOW_TYPE_1;
	}
	windowManager.registerContentWindow(ContentWindowTab1);
	class ContentWindowTab2 extends ContentWindow {
		static contentWindowTypeId = CONTENT_WINDOW_TYPE_2;
	}
	windowManager.registerContentWindow(ContentWindowTab2);
	class ContentWindowTab3 extends ContentWindow {
		static contentWindowTypeId = CONTENT_WINDOW_TYPE_3;
	}
	windowManager.registerContentWindow(ContentWindowTab3);
	class ContentWindowTab4 extends ContentWindow {
		static contentWindowTypeId = CONTENT_WINDOW_TYPE_4;
	}
	windowManager.registerContentWindow(ContentWindowTab4);
	await windowManager.init(mockPreferencesManager);

	return {
		windowManager, shortcutConditionSetValueCalls,
		studio: mockStudio,
		preferencesManager: mockPreferencesManager,
		cleanup,
		ContentWindowTab1, ContentWindowTab2, ContentWindowTab3, ContentWindowTab4,
	};
}

Deno.test({
	name: "Registering content window with wrong class type",
	async fn() {
		const {windowManager, cleanup} = await basicSetup();

		try {
			class NotAContentWindow {}

			assertThrows(() => {
				windowManager.registerContentWindow(/** @type {any} */ (NotAContentWindow));
			}, Error, 'Tried to register content window "NotAContentWindow" that does not extend ContentWindow class.');
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "Registering a content window without a type",
	async fn() {
		class MissingType extends ContentWindow {
		}

		const {windowManager, cleanup} = await basicSetup();

		try {
			assertThrows(() => {
				windowManager.registerContentWindow(MissingType);
			}, Error, 'Tried to register content window "MissingType" with no type id, override the static contentWindowTypeId property in order for this content window to function properly.');
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "Registering a content window without a namespace in the type",
	async fn() {
		class MissingNamespace extends ContentWindow {
			static contentWindowTypeId = "nonamespace";
		}
		class EmptyNamespace extends ContentWindow {
			static contentWindowTypeId = ":nonamespace";
		}
		class EmptyType extends ContentWindow {
			static contentWindowTypeId = "notype:";
		}

		const {windowManager, cleanup} = await basicSetup();

		try {
			assertThrows(() => {
				windowManager.registerContentWindow(MissingNamespace);
			}, Error, 'Tried to register content window "MissingNamespace" without a namespace in the contentWindowTypeId.');
			assertThrows(() => {
				windowManager.registerContentWindow(EmptyNamespace);
			}, Error, 'Tried to register content window "EmptyNamespace" without a namespace in the contentWindowTypeId.');
			assertThrows(() => {
				windowManager.registerContentWindow(EmptyType);
			}, Error, 'Tried to register content window "EmptyType" without a namespace in the contentWindowTypeId.');
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "loading basic workspace",
	async fn() {
		const {windowManager, cleanup} = await basicSetup();

		try {
			assertInstanceOf(windowManager.rootWindow, SplitStudioWindow);
			assertInstanceOf(windowManager.rootWindow.windowA, TabsStudioWindow);
			assertInstanceOf(windowManager.rootWindow.windowB, TabsStudioWindow);
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "closing the last tab of a window",
	async fn() {
		const {studio, windowManager, cleanup} = await basicSetup({
			getActiveWorkspaceDataReturn: {
				rootWindow: {
					type: "split",
					splitHorizontal: true,
					splitPercentage: 0.5,
					windowA: {
						type: "split",
						splitHorizontal: true,
						splitPercentage: 0.5,
						windowA: {
							type: "tabs",
							tabTypes: [CONTENT_WINDOW_TYPE_1],
							tabUuids: [CONTENT_WINDOW_UUID_1],
							activeTabIndex: 0,
						},
						windowB: {
							type: "tabs",
							tabTypes: [CONTENT_WINDOW_TYPE_2],
							tabUuids: [CONTENT_WINDOW_UUID_2],
							activeTabIndex: 0,
						},
					},
					windowB: {
						type: "tabs",
						tabTypes: [CONTENT_WINDOW_TYPE_2, CONTENT_WINDOW_TYPE_3],
						tabUuids: [CONTENT_WINDOW_UUID_3, CONTENT_WINDOW_UUID_4],
						activeTabIndex: 0,
					},
				},
			},
		});

		try {
			const {mockPopoverManager, getLastCreatedStructure} = createMockPopoverManager();
			studio.popoverManager = mockPopoverManager;

			assertInstanceOf(windowManager.rootWindow, SplitStudioWindow);
			assertInstanceOf(windowManager.rootWindow.windowA, SplitStudioWindow);
			const closingTabsWindow = windowManager.rootWindow.windowA.windowA;
			assertInstanceOf(closingTabsWindow, TabsStudioWindow);

			closingTabsWindow.onTabsContextMenu(closingTabsWindow.tabsSelectorGroup.buttons[0], new MouseEvent("contextmenu"));
			const structure = getLastCreatedStructure();
			triggerContextMenuItem(structure, ["Close Tab"]);

			await waitForMicrotasks();

			const data = await windowManager.workspaceManager.getActiveWorkspaceData();

			assertEquals(data, {
				rootWindow: {
					splitHorizontal: true,
					splitPercentage: 0.5,
					type: "split",
					windowA: {
						type: "tabs",
						activeTabIndex: 0,
						tabTypes: [CONTENT_WINDOW_TYPE_2],
						tabUuids: [CONTENT_WINDOW_UUID_2],
					},
					windowB: {
						type: "tabs",
						activeTabIndex: 0,
						tabTypes: [CONTENT_WINDOW_TYPE_2, CONTENT_WINDOW_TYPE_3],
						tabUuids: [CONTENT_WINDOW_UUID_3, CONTENT_WINDOW_UUID_4],
					},
				},
			});
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "Clicking tab buttons changes the active tab",
	async fn() {
		const {windowManager, cleanup} = await basicSetup();

		try {
			assertInstanceOf(windowManager.rootWindow, SplitStudioWindow);
			const changingTabsWindow = windowManager.rootWindow.windowA;
			assertInstanceOf(changingTabsWindow, TabsStudioWindow);
			assertEquals(changingTabsWindow.activeTabIndex, 0);

			const saveWorkspaceSpy = spy(windowManager.workspaceManager, "setActiveWorkspaceData");

			changingTabsWindow.tabsSelectorGroup.buttons[1].click();

			assertEquals(changingTabsWindow.activeTabIndex, 1);
			assertSpyCalls(saveWorkspaceSpy, 1);
			assertSpyCall(saveWorkspaceSpy, 0, {
				args: [
					{
						type: "split",
						splitHorizontal: true,
						splitPercentage: 0.5,
						windowA: {
							type: "tabs",
							activeTabIndex: 1,
							tabTypes: [CONTENT_WINDOW_TYPE_1, CONTENT_WINDOW_TYPE_2],
							tabUuids: [CONTENT_WINDOW_UUID_1, CONTENT_WINDOW_UUID_2],
						},
						windowB: {
							type: "tabs",
							activeTabIndex: 0,
							tabTypes: [CONTENT_WINDOW_TYPE_2, CONTENT_WINDOW_TYPE_3],
							tabUuids: [CONTENT_WINDOW_UUID_3, CONTENT_WINDOW_UUID_4],
						},
					},
					{
						windows: [],
						workspace: {},
					},
				],
			});
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "lastClickedContentWindow",
	async fn() {
		const {windowManager, shortcutConditionSetValueCalls, cleanup} = await basicSetup();

		try {
			assertInstanceOf(windowManager.rootWindow, SplitStudioWindow);
			assertInstanceOf(windowManager.rootWindow.windowA, TabsStudioWindow);
			windowManager.rootWindow.windowA.el.dispatchEvent(new MouseEvent("click"));

			assertStrictEquals(windowManager.lastClickedContentWindow, windowManager.rootWindow.windowA.tabs[0]);
			assertEquals(shortcutConditionSetValueCalls, [["windowManager.lastClickedContentWindowTypeId", CONTENT_WINDOW_TYPE_1]]);
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "lastFocusedContentWindow",
	async fn() {
		const {windowManager, shortcutConditionSetValueCalls, cleanup} = await basicSetup();

		try {
			assertInstanceOf(windowManager.rootWindow, SplitStudioWindow);
			assertInstanceOf(windowManager.rootWindow.windowA, TabsStudioWindow);
			triggerOnFocusedWithinChange(windowManager.rootWindow.windowA);

			assertStrictEquals(windowManager.lastFocusedContentWindow, windowManager.rootWindow.windowA.tabs[0]);
			assertEquals(shortcutConditionSetValueCalls, [["windowManager.lastFocusedContentWindowTypeId", CONTENT_WINDOW_TYPE_1]]);
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "Creates the appropriate content window locations",
	async fn() {
		/** @type {import("std/testing/mock.ts").Spy} */
		let addLocationSpy;
		/** @type {import("std/testing/mock.ts").Spy} */
		let removeLocationSpy;
		const {cleanup, windowManager} = await basicSetup({
			beforeCreate(studio) {
				addLocationSpy = spy(studio.preferencesManager, "addLocation");
				removeLocationSpy = spy(studio.preferencesManager, "removeLocation");
			},
		});

		const fn = (async () => {
			try {
				assertSpyCalls(addLocationSpy, 5);
				assertSpyCalls(removeLocationSpy, 0);
				assertEquals(addLocationSpy.calls[0].args[0].contentWindowUuid, CONTENT_WINDOW_UUID_1);
				assertEquals(addLocationSpy.calls[1].args[0].contentWindowUuid, CONTENT_WINDOW_UUID_2);
				assertEquals(addLocationSpy.calls[2].args[0].contentWindowUuid, CONTENT_WINDOW_UUID_3);
				assertEquals(addLocationSpy.calls[3].args[0].contentWindowUuid, CONTENT_WINDOW_UUID_4);

				const workspaceLocation = addLocationSpy.calls[4].args[0];
				assertInstanceOf(workspaceLocation, WorkspacePreferencesLocation);
				assertEquals(workspaceLocation.locationType, "workspace");

				await windowManager.reloadCurrentWorkspace();
				assertSpyCalls(removeLocationSpy, 5);
				assertSpyCalls(addLocationSpy, 10);
			} finally {
				cleanup();
			}
		});
		await fn();
	},
});

Deno.test({
	name: "Saves and loads workspace location preferences",
	async fn() {
		const {cleanup, windowManager, preferencesManager} = await basicSetup({
			getActiveWorkspaceDataReturn: {
				preferences: {
					workspace: {
						pref1: "foo",
						pref2: "bar",
					},
					windows: [],
				},
				rootWindow: {
					type: "tabs",
					activeTabIndex: 0,
					tabTypes: [CONTENT_WINDOW_TYPE_1, CONTENT_WINDOW_TYPE_2],
					tabUuids: [CONTENT_WINDOW_UUID_1, CONTENT_WINDOW_UUID_2],
				},
			},
		});

		try {
			const pref1 = preferencesManager.getUiValueAtLocation("pref1", "workspace");
			assertEquals(pref1, "foo");

			preferencesManager.set("pref1", "new value", {
				location: "workspace",
			});
			preferencesManager.set("pref2", "new value", {
				location: "workspace",
			});

			const saveWorkspaceSpy = spy(windowManager.workspaceManager, "setActiveWorkspaceData");

			// TODO: trigger this from changing the preference instead of by clicking a tab
			const changingTabsWindow = windowManager.rootWindow;
			assertInstanceOf(changingTabsWindow, TabsStudioWindow);
			assertEquals(changingTabsWindow.activeTabIndex, 0);
			changingTabsWindow.tabsSelectorGroup.buttons[1].click();

			assertEquals(changingTabsWindow.activeTabIndex, 1);
			assertSpyCalls(saveWorkspaceSpy, 1);
			assertEquals(saveWorkspaceSpy.calls[0].args[1], {
				workspace: {
					pref1: "new value",
					pref2: "new value",
				},
				windows: [],
			});
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "setContentWindowPreferences() loads the preferences on the correct content window",
	async fn() {
		const {windowManager, preferencesManager, cleanup} = await basicSetup();

		try {
			// First we set a few values to verify that they get deleted later on
			windowManager.setContentWindowPreferences([
				{
					type: "unknown",
					id: CONTENT_WINDOW_UUID_1,
					data: {
						pref1: "content window 1",
					},
				},
				{
					type: "unknown",
					id: CONTENT_WINDOW_UUID_2,
					data: {
						pref1: "content window 2",
					},
				},
				{
					type: "unknown",
					id: CONTENT_WINDOW_UUID_3,
					data: {
						pref1: "content window 3",
					},
				},
			]);
			assertEquals(preferencesManager.get("pref1", CONTENT_WINDOW_UUID_1), "content window 1");
			assertEquals(preferencesManager.get("pref1", CONTENT_WINDOW_UUID_2), "content window 2");
			assertEquals(preferencesManager.get("pref1", CONTENT_WINDOW_UUID_3), "content window 3");

			windowManager.setContentWindowPreferences([
				// Data with known uuids
				{
					type: "unknown",
					id: CONTENT_WINDOW_UUID_1,
					data: {
						pref2: "foo",
					},
				},
				// Data with known types
				{
					type: CONTENT_WINDOW_TYPE_2,
					id: "unknown uuid",
					data: {
						pref3: "bar",
					},
				},
				// Window 3 has no data, this should only delete old values
			]);

			assertEquals(preferencesManager.get("pref2", CONTENT_WINDOW_UUID_1), "foo");
			assertEquals(preferencesManager.get("pref3", CONTENT_WINDOW_UUID_2), "bar");

			// Verify that old values are deleted
			assertEquals(preferencesManager.get("pref1", CONTENT_WINDOW_UUID_1), "");
			assertEquals(preferencesManager.get("pref1", CONTENT_WINDOW_UUID_2), "");
			assertEquals(preferencesManager.get("pref1", CONTENT_WINDOW_UUID_3), "");
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "Flushing content window locations",
	async fn() {
		const {windowManager, preferencesManager, cleanup} = await basicSetup();

		try {
			/** @type {Set<() => void>} */
			const flushPromises = new Set();

			/**
			 * @param {unknown} data
			 */
			const flushFn = data => {
				/** @type {Promise<void>} */
				const promise = new Promise(resolve => {
					flushPromises.add(resolve);
				});
				return promise;
			};
			function resolveFlushPromises() {
				flushPromises.forEach(resolve => resolve());
				flushPromises.clear();
			}
			const flushSpy = spy(flushFn);
			windowManager.onContentWindowPreferencesFlushRequest(flushSpy);

			preferencesManager.set("pref1", "foo", {
				location: "contentwindow-project",
				contentWindowUuid: CONTENT_WINDOW_UUID_1,
				flush: false,
			});

			const flushPromise1 = preferencesManager.flush();

			assertSpyCalls(flushSpy, 1);
			assertSpyCall(flushSpy, 0, {
				args: [
					[
						{
							data: {
								pref1: "foo",
							},
							id: "uuid1",
							type: CONTENT_WINDOW_TYPE_1,
						},
					],
				],
			});

			// Flush should stay pending until all flush promises have been resolved
			await assertPromiseResolved(flushPromise1, false);
			resolveFlushPromises();
			await assertPromiseResolved(flushPromise1, true);

			// When there is no data, the flushed data should be null
			preferencesManager.reset("pref1", {
				location: "contentwindow-project",
				contentWindowUuid: CONTENT_WINDOW_UUID_1,
				flush: false,
			});
			const flushPromise2 = preferencesManager.flush();
			await assertPromiseResolved(flushPromise2, false);
			resolveFlushPromises();
			await assertPromiseResolved(flushPromise2, true);

			assertSpyCalls(flushSpy, 2);
			assertSpyCall(flushSpy, 1, {
				args: [null],
			});

			// The listener should not fire after being removed
			windowManager.removeOnContentWindowPreferencesFlushRequest(flushSpy);

			preferencesManager.set("pref1", "foo", {
				location: "contentwindow-project",
				contentWindowUuid: CONTENT_WINDOW_UUID_1,
				flush: false,
			});

			const flushPromise3 = preferencesManager.flush();
			await assertPromiseResolved(flushPromise3, true);

			assertSpyCalls(flushSpy, 2);
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "getContentWindows() by id",
	async fn() {
		const {windowManager, ContentWindowTab2, cleanup} = await basicSetup();

		try {
			const result = Array.from(windowManager.getContentWindows(CONTENT_WINDOW_TYPE_2));
			assertEquals(result.length, 2);
			assertInstanceOf(result[0], ContentWindowTab2);
			assertInstanceOf(result[1], ContentWindowTab2);

			// Check return type for known strings
			{
				const actualType = Array.from(windowManager.getContentWindows("renda:about"))[0];
				const assertType = /** @type {import("../../../../../studio/src/windowManagement/contentWindows/ContentWindowAbout.js").ContentWindowAbout} */ (/** @type {unknown} */ (null));
				assertIsType(assertType, actualType);
				// @ts-expect-error Verify that the type isn't 'any'
				assertIsType(true, actualType);
			}

			// Check return type for unknown strings
			{
				const actualType = Array.from(windowManager.getContentWindows("unknown"))[0];
				const assertType = /** @type {import("../../../../../studio/src/windowManagement/contentWindows/ContentWindow.js").ContentWindow} */ (/** @type {unknown} */ (null));
				assertIsType(assertType, actualType);
				// @ts-expect-error Verify that the type isn't 'any'
				assertIsType(true, actualType);
			}
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "getContentWindows() by constructor",
	async fn() {
		const {windowManager, ContentWindowTab2, cleanup} = await basicSetup();

		try {
			const result = Array.from(windowManager.getContentWindows(ContentWindowTab2));
			assertEquals(result.length, 2);
			assertInstanceOf(result[0], ContentWindowTab2);
			assertInstanceOf(result[1], ContentWindowTab2);

			const actualType = Array.from(windowManager.getContentWindows(ContentWindowTab2))[0];
			const assertType = /** @type {InstanceType<ContentWindowTab2>} */ (/** @type {unknown} */ (null));
			assertIsType(assertType, actualType);
			// @ts-expect-error Verify that the type isn't 'any'
			assertIsType(true, actualType);
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "existing getOrCreateContentWindow() by id",
	async fn() {
		const {windowManager, ContentWindowTab2, cleanup} = await basicSetup();

		try {
			const windowsBeforeCall = Array.from(windowManager.allContentWindows());

			const result = windowManager.getOrCreateContentWindow(CONTENT_WINDOW_TYPE_2);
			assertInstanceOf(result, ContentWindowTab2);
			assert(windowsBeforeCall.includes(result), "Expected content window to not get created");

			// Check return type for known strings
			{
				const actualType = windowManager.getOrCreateContentWindow("renda:about");
				const assertType = /** @type {import("../../../../../studio/src/windowManagement/contentWindows/ContentWindowAbout.js").ContentWindowAbout} */ (/** @type {unknown} */ (null));
				assertIsType(assertType, actualType);
				// @ts-expect-error Verify that the type isn't 'any'
				assertIsType(true, actualType);
			}

			// Check return type for unknown strings
			{
				const actualType = windowManager.getOrCreateContentWindow("unknown");
				const assertType = /** @type {import("../../../../../studio/src/windowManagement/contentWindows/ContentWindow.js").ContentWindow} */ (/** @type {unknown} */ (null));
				assertIsType(assertType, actualType);
				// @ts-expect-error Verify that the type isn't 'any'
				assertIsType(true, actualType);
			}
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "existing getOrCreateContentWindow() by constructor",
	async fn() {
		const {windowManager, ContentWindowTab2, cleanup} = await basicSetup();

		try {
			const windowsBeforeCall = Array.from(windowManager.allContentWindows());

			const result = windowManager.getOrCreateContentWindow(ContentWindowTab2);
			assertInstanceOf(result, ContentWindowTab2);
			assert(windowsBeforeCall.includes(result), "Expected content window to not get created");

			const actualType = windowManager.getOrCreateContentWindow(ContentWindowTab2);
			const assertType = /** @type {InstanceType<ContentWindowTab2>} */ (/** @type {unknown} */ (null));
			assertIsType(assertType, actualType);
			// @ts-expect-error Verify that the type isn't 'any'
			assertIsType(true, actualType);
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "non existent getOrCreateContentWindow() by id",
	async fn() {
		const {windowManager, ContentWindowTab4, cleanup} = await basicSetup();

		try {
			const windowsBeforeCall = Array.from(windowManager.allContentWindows());

			const result = windowManager.getOrCreateContentWindow(CONTENT_WINDOW_TYPE_4);
			assertInstanceOf(result, ContentWindowTab4);
			assert(!windowsBeforeCall.includes(result), "Expected content window to get created");
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "non existent getOrCreateContentWindow() by constructor",
	async fn() {
		const {windowManager, ContentWindowTab4, cleanup} = await basicSetup();

		try {
			const windowsBeforeCall = Array.from(windowManager.allContentWindows());

			const result = windowManager.getOrCreateContentWindow(ContentWindowTab4);
			assertInstanceOf(result, ContentWindowTab4);
			assert(!windowsBeforeCall.includes(result), "Expected content window to get created");
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "getMostSuitableContentWindow by id",
	async fn() {
		const {windowManager, ContentWindowTab2, cleanup} = await basicSetup();

		try {
			// When no windows of the provided type have been focused, the first one is returned.
			{
				const windowsBeforeCall = Array.from(windowManager.allContentWindows());

				const result = windowManager.getMostSuitableContentWindow(CONTENT_WINDOW_TYPE_2);
				assertInstanceOf(result, ContentWindowTab2);
				assert(windowsBeforeCall.includes(result), "Expected content window to not get created");

				assertInstanceOf(windowManager.rootWindow, SplitStudioWindow);
				assertInstanceOf(windowManager.rootWindow.windowA, TabsStudioWindow);
				assertStrictEquals(result, windowManager.rootWindow.windowA.tabs[1]);
			}

			// When a window has been focused before, that is returned
			{
				assertInstanceOf(windowManager.rootWindow.windowB, TabsStudioWindow);
				// Verify that the active tab is ContentWindowTab2, in case the tests change in the future
				assertInstanceOf(windowManager.rootWindow.windowB.activeTab, ContentWindowTab2);
				triggerOnFocusedWithinChange(windowManager.rootWindow.windowB);

				const windowsBeforeCall = Array.from(windowManager.allContentWindows());

				const result = windowManager.getMostSuitableContentWindow(CONTENT_WINDOW_TYPE_2);
				assertInstanceOf(result, ContentWindowTab2);
				assert(windowsBeforeCall.includes(result), "Expected content window to not get created");
				assertStrictEquals(result, windowManager.rootWindow.windowB.tabs[0]);
			}

			// Check return type for known strings
			{
				const actualType = windowManager.getMostSuitableContentWindow("renda:about");
				const assertType = /** @type {import("../../../../../studio/src/windowManagement/contentWindows/ContentWindowAbout.js").ContentWindowAbout} */ (/** @type {unknown} */ (null));
				assertIsType(assertType, actualType);
				// @ts-expect-error Verify that the type isn't 'any'
				assertIsType(true, actualType);
			}

			// Check return type for unknown strings
			{
				const actualType = windowManager.getMostSuitableContentWindow("unknown");
				const assertType = /** @type {import("../../../../../studio/src/windowManagement/contentWindows/ContentWindow.js").ContentWindow} */ (/** @type {unknown} */ (null));
				assertIsType(assertType, actualType);
				// @ts-expect-error Verify that the type isn't 'any'
				assertIsType(true, actualType);
			}
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "create using getMostSuitableContentWindow by id",
	async fn() {
		const {windowManager, ContentWindowTab4, cleanup} = await basicSetup();

		try {
			const windowsBeforeCall = Array.from(windowManager.allContentWindows());

			const result = windowManager.getMostSuitableContentWindow(CONTENT_WINDOW_TYPE_4);
			assertInstanceOf(result, ContentWindowTab4);
			assert(!windowsBeforeCall.includes(result), "Expected content window to get created");
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "getMostSuitableContentWindow by id, create = false",
	async fn() {
		const {windowManager, ContentWindowTab2, cleanup} = await basicSetup();

		try {
			// When no windows of the provided type have been focused, the first one is returned.
			{
				const windowsBeforeCall = Array.from(windowManager.allContentWindows());

				const result = windowManager.getMostSuitableContentWindow(CONTENT_WINDOW_TYPE_2, false);
				assertInstanceOf(result, ContentWindowTab2);
				assert(windowsBeforeCall.includes(result), "Expected content window to not get created");

				assertInstanceOf(windowManager.rootWindow, SplitStudioWindow);
				assertInstanceOf(windowManager.rootWindow.windowA, TabsStudioWindow);
				assertStrictEquals(result, windowManager.rootWindow.windowA.tabs[1]);
			}

			// When it doesn't exist, it returns null
			{
				const result = windowManager.getMostSuitableContentWindow(CONTENT_WINDOW_TYPE_4, false);
				assertEquals(result, null);
			}

			// Check return type for known strings
			{
				const actualType = windowManager.getMostSuitableContentWindow("renda:about", false);
				const contentWindowAbout = /** @type {import("../../../../../studio/src/windowManagement/contentWindows/ContentWindowAbout.js").ContentWindowAbout} */ (/** @type {unknown} */ (null));
				const maybeContentWindowAbout = /** @type {typeof contentWindowAbout?} */ (contentWindowAbout);

				// Verify that the type is `ContentWindowAbout | null`
				assertIsType(maybeContentWindowAbout, actualType);
				assertIsType(actualType, contentWindowAbout);
				assertIsType(actualType, null);

				// @ts-expect-error Verify that the type isn't 'any'
				assertIsType(true, actualType);
			}

			// Check return type for unknown strings
			{
				const actualType = windowManager.getMostSuitableContentWindow("unknown", false);
				const contentWindow = /** @type {import("../../../../../studio/src/windowManagement/contentWindows/ContentWindow.js").ContentWindow} */ (/** @type {unknown} */ (null));
				const maybeContentWindow = /** @type {typeof contentWindow?} */ (contentWindow);

				// Verify that the type is `ContentWindow | null`
				assertIsType(maybeContentWindow, actualType);
				assertIsType(actualType, contentWindow);
				assertIsType(actualType, null);

				// @ts-expect-error Verify that the type isn't 'any'
				assertIsType(true, actualType);
			}
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "getMostSuitableContentWindow by constructor",
	async fn() {
		const {windowManager, ContentWindowTab2, cleanup} = await basicSetup();

		try {
			// When no windows of the provided type have been focused, the first one is returned.
			{
				const windowsBeforeCall = Array.from(windowManager.allContentWindows());

				const result = windowManager.getMostSuitableContentWindow(ContentWindowTab2);
				assertInstanceOf(result, ContentWindowTab2);
				assert(windowsBeforeCall.includes(result), "Expected content window to not get created");

				assertInstanceOf(windowManager.rootWindow, SplitStudioWindow);
				assertInstanceOf(windowManager.rootWindow.windowA, TabsStudioWindow);
				assertStrictEquals(result, windowManager.rootWindow.windowA.tabs[1]);
			}

			// When a window has been focused before, that is returned
			{
				assertInstanceOf(windowManager.rootWindow.windowB, TabsStudioWindow);
				// Verify that the active tab is ContentWindowTab2, in case the tests change in the future
				assertInstanceOf(windowManager.rootWindow.windowB.activeTab, ContentWindowTab2);
				triggerOnFocusedWithinChange(windowManager.rootWindow.windowB);

				const windowsBeforeCall = Array.from(windowManager.allContentWindows());

				const result = windowManager.getMostSuitableContentWindow(ContentWindowTab2);
				assertInstanceOf(result, ContentWindowTab2);
				assert(windowsBeforeCall.includes(result), "Expected content window to not get created");
				assertStrictEquals(result, windowManager.rootWindow.windowB.tabs[0]);
			}

			// Check return type
			{
				const actualType = windowManager.getMostSuitableContentWindow(ContentWindowTab2);
				const assertType = /** @type {InstanceType<ContentWindowTab2>} */ (/** @type {unknown} */ (null));
				assertIsType(assertType, actualType);
				// @ts-expect-error Verify that the type isn't 'any'
				assertIsType(true, actualType);
			}
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "create using getMostSuitableContentWindow by constructor",
	async fn() {
		const {windowManager, ContentWindowTab4, cleanup} = await basicSetup();

		try {
			const windowsBeforeCall = Array.from(windowManager.allContentWindows());

			const result = windowManager.getMostSuitableContentWindow(ContentWindowTab4);
			assertInstanceOf(result, ContentWindowTab4);
			assert(!windowsBeforeCall.includes(result), "Expected content window to get created");
		} finally {
			cleanup();
		}
	},
});

Deno.test({
	name: "getMostSuitableContentWindow by constructor, create = false",
	async fn() {
		const {windowManager, ContentWindowTab2, ContentWindowTab4, cleanup} = await basicSetup();

		try {
			// When no windows of the provided type have been focused, the first one is returned.
			{
				const windowsBeforeCall = Array.from(windowManager.allContentWindows());

				const result = windowManager.getMostSuitableContentWindow(ContentWindowTab2, false);
				assertInstanceOf(result, ContentWindowTab2);
				assert(windowsBeforeCall.includes(result), "Expected content window to not get created");

				assertInstanceOf(windowManager.rootWindow, SplitStudioWindow);
				assertInstanceOf(windowManager.rootWindow.windowA, TabsStudioWindow);
				assertStrictEquals(result, windowManager.rootWindow.windowA.tabs[1]);
			}

			// When it doesn't exist, it returns null
			{
				const result = windowManager.getMostSuitableContentWindow(ContentWindowTab4, false);
				assertEquals(result, null);
			}

			// Verify return type
			{
				const actualType = windowManager.getMostSuitableContentWindow(ContentWindowTab4, false);
				const contentWindowTab4 = /** @type {InstanceType<ContentWindowTab4>} */ (/** @type {unknown} */ (null));
				const maybeContentWindowTab4 = /** @type {typeof contentWindowTab4?} */ (contentWindowTab4);

				// Verify that the type is `ContentWindowAbout | null`
				assertIsType(maybeContentWindowTab4, actualType);
				assertIsType(actualType, contentWindowTab4);
				assertIsType(actualType, null);

				// @ts-expect-error Verify that the type isn't 'any'
				assertIsType(true, actualType);
			}
		} finally {
			cleanup();
		}
	},
});

