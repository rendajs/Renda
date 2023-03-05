import {Importer} from "fake-imports";
import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {assertEquals, assertInstanceOf, assertStrictEquals, assertThrows} from "std/testing/asserts.ts";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {FakeMouseEvent} from "fake-dom/FakeMouseEvent.js";
import {injectMockStudioInstance} from "../../../../../studio/src/studioInstance.js";
import {PreferencesManager} from "../../../../../studio/src/preferences/PreferencesManager.js";
import {PreferencesLocation} from "../../../../../studio/src/preferences/preferencesLocation/PreferencesLocation.js";
import {assertPromiseResolved} from "../../../shared/asserts.js";

const importer = new Importer(import.meta.url);
importer.redirectModule("../../../../../src/util/IndexedDbUtil.js", "../../shared/MockIndexedDbUtil.js");
importer.makeReal("../../../../../studio/src/studioInstance.js");
importer.makeReal("../../../../../src/mod.js");
importer.makeReal("../../../../../src/util/mod.js");
importer.makeReal("../../../../../studio/src/preferences/preferencesLocation/ContentWindowPreferencesLocation.js");

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
const CONTENT_WINDOW_TYPE_1 = "namespace:content window type 1";
const CONTENT_WINDOW_TYPE_2 = "namespace:content window type 2";
const CONTENT_WINDOW_TYPE_3 = "namespace:content window type 3";

/** @type {import("../../../../../studio/src/windowManagement/WorkspaceManager.js")} */
const WorkspaceManagerMod = await importer.import("../../../../../studio/src/windowManagement/WorkspaceManager.js");
const {WorkspaceManager} = WorkspaceManagerMod;
stub(WorkspaceManager.prototype, "getActiveWorkspaceData", async () => {
	/** @type {import("../../../../../studio/src/windowManagement/WorkspaceManager.js").WorkspaceData} */
	const workspaceData = {
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
				tabTypes: [CONTENT_WINDOW_TYPE_3],
				tabUuids: [CONTENT_WINDOW_UUID_3],
				activeTabIndex: 0,
			},
		},
	};
	return workspaceData;
});

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
 * @param {(ctx: WindowManagerTestContext) => Promise<void> | void} options.fn The test function to run.
 */
async function basicSetup({
	beforeCreate,
	fn,
}) {
	installFakeDocument();

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

	try {
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
		await windowManager.init();

		await fn({windowManager, shortcutConditionSetValueCalls, studio: mockStudio, preferencesManager: mockPreferencesManager});
	} finally {
		uninstallFakeDocument();
		injectMockStudioInstance(null);
	}
}

Deno.test({
	name: "Registering content window with wrong class type",
	async fn() {
		await basicSetup({
			fn({windowManager}) {
				class NotAContentWindow {}

				assertThrows(() => {
					windowManager.registerContentWindow(/** @type {any} */ (NotAContentWindow));
				}, Error, 'Tried to register content window "NotAContentWindow" that does not extend ContentWindow class.');
			},
		});
	},
});

Deno.test({
	name: "Registering a content window without a type",
	async fn() {
		class MissingType extends ContentWindow {
		}

		await basicSetup({
			fn({windowManager}) {
				assertThrows(() => {
					windowManager.registerContentWindow(MissingType);
				}, Error, 'Tried to register content window "MissingType" with no type id, override the static contentWindowTypeId property in order for this content window to function properly.');
			},
		});
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

		await basicSetup({
			fn({windowManager}) {
				assertThrows(() => {
					windowManager.registerContentWindow(MissingNamespace);
				}, Error, 'Tried to register content window "MissingNamespace" without a namespace in the contentWindowTypeId.');
				assertThrows(() => {
					windowManager.registerContentWindow(EmptyNamespace);
				}, Error, 'Tried to register content window "EmptyNamespace" without a namespace in the contentWindowTypeId.');
				assertThrows(() => {
					windowManager.registerContentWindow(EmptyType);
				}, Error, 'Tried to register content window "EmptyType" without a namespace in the contentWindowTypeId.');
			},
		});
	},
});

Deno.test({
	name: "loading basic workspace",
	async fn() {
		await basicSetup({
			fn({windowManager}) {
				assertInstanceOf(windowManager.rootWindow, SplitStudioWindow);
				assertInstanceOf(windowManager.rootWindow.windowA, TabsStudioWindow);
				assertInstanceOf(windowManager.rootWindow.windowB, TabsStudioWindow);
			},
		});
	},
});

Deno.test({
	name: "lastClickedContentWindow",
	async fn() {
		await basicSetup({
			async fn({windowManager, shortcutConditionSetValueCalls}) {
				assertInstanceOf(windowManager.rootWindow, SplitStudioWindow);
				assertInstanceOf(windowManager.rootWindow.windowA, TabsStudioWindow);
				const e = new FakeMouseEvent("click");
				windowManager.rootWindow.windowA.el.dispatchEvent(e);

				assertStrictEquals(windowManager.lastClickedContentWindow, windowManager.rootWindow.windowA.tabs[0]);
				assertEquals(shortcutConditionSetValueCalls, [["windowManager.lastClickedContentWindowTypeId", CONTENT_WINDOW_TYPE_1]]);
			},
		});
	},
});

Deno.test({
	name: "lastFocusedContentWindow",
	async fn() {
		await basicSetup({
			async fn({windowManager, shortcutConditionSetValueCalls}) {
				assertInstanceOf(windowManager.rootWindow, SplitStudioWindow);
				assertInstanceOf(windowManager.rootWindow.windowA, TabsStudioWindow);
				const castWindow = /** @type {StudioWindowWithSym} */ (/** @type {unknown} */ (windowManager.rootWindow.windowA));
				castWindow[onFocusedWithinChangeSym].forEach(cb => cb(true));

				assertStrictEquals(windowManager.lastFocusedContentWindow, windowManager.rootWindow.windowA.tabs[0]);
				assertEquals(shortcutConditionSetValueCalls, [["windowManager.lastFocusedContentWindowTypeId", CONTENT_WINDOW_TYPE_1]]);
			},
		});
	},
});

Deno.test({
	name: "Each content window registers a preferences location",
	async fn() {
		/** @type {import("std/testing/mock.ts").Spy} */
		let addLocationSpy;
		await basicSetup({
			beforeCreate(studio) {
				addLocationSpy = spy(studio.preferencesManager, "addLocation");
			},
			async fn() {
				assertSpyCalls(addLocationSpy, 3);
			},
		});
	},
});

Deno.test({
	name: "setContentWindowPreferences() loads the preferences on the correct content window",
	async fn() {
		await basicSetup({
			async fn({windowManager, preferencesManager}) {
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
				assertEquals(preferencesManager.get("pref1", {
					contentWindowUuid: CONTENT_WINDOW_UUID_1,
				}), "content window 1");
				assertEquals(preferencesManager.get("pref1", {
					contentWindowUuid: CONTENT_WINDOW_UUID_2,
				}), "content window 2");
				assertEquals(preferencesManager.get("pref1", {
					contentWindowUuid: CONTENT_WINDOW_UUID_3,
				}), "content window 3");

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

				assertEquals(preferencesManager.get("pref2", {
					contentWindowUuid: CONTENT_WINDOW_UUID_1,
				}), "foo");
				assertEquals(preferencesManager.get("pref3", {
					contentWindowUuid: CONTENT_WINDOW_UUID_2,
				}), "bar");

				// Verify that old values are deleted
				assertEquals(preferencesManager.get("pref1", {
					contentWindowUuid: CONTENT_WINDOW_UUID_1,
				}), "");
				assertEquals(preferencesManager.get("pref1", {
					contentWindowUuid: CONTENT_WINDOW_UUID_2,
				}), "");
				assertEquals(preferencesManager.get("pref1", {
					contentWindowUuid: CONTENT_WINDOW_UUID_3,
				}), "");
			},
		});
	},
});

Deno.test({
	name: "Flushing content window locations",
	async fn() {
		await basicSetup({
			async fn({windowManager, preferencesManager}) {
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
			},
		});
	},
});
