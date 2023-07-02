import {assertEquals, assertExists} from "std/testing/asserts.ts";
import {PreferencesManager} from "../../../../../../../studio/src/preferences/PreferencesManager.js";
import {ContentWindowPreferencesLocation} from "../../../../../../../studio/src/preferences/preferencesLocation/ContentWindowPreferencesLocation.js";
import {injectMockStudioInstance} from "../../../../../../../studio/src/studioInstance.js";
import {EntryPointPopover, getSelectedEntryPoint} from "../../../../../../../studio/src/windowManagement/contentWindows/ContentWindowBuildView/EntryPointPopover.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {PreferencesLocation} from "../../../../../../../studio/src/preferences/preferencesLocation/PreferencesLocation.js";
import {waitForMicrotasks} from "../../../../../shared/waitForMicroTasks.js";

const DEFAULT_CONTENT_WINDOW_UUID = "content window uuid";
const ENTRY_POINT_UUID_1 = "entry point uuid 1";
const ENTRY_POINT_UUID_2 = "entry point uuid 2";
const ENTRY_POINT_UUID_3 = "entry point uuid 3";
const ENTRY_POINT_UUID_4 = "entry point uuid 4";
const ENTRY_POINT_UUID_5 = "entry point uuid 5";

function basicTest() {
	const popoverManager = /** @type {import("../../../../../../../studio/src/ui/popoverMenus/PopoverManager.js").PopoverManager} */ ({});
	const windowManager = /** @type {import("../../../../../../../studio/src/windowManagement/WindowManager.js").WindowManager} */ ({});

	const preferencesManager = new PreferencesManager({
		"buildView.availableEntryPoints": {
			type: "unknown",
		},
		"buildView.selectedEntryPoint": {
			type: "string",
		},
	});
	preferencesManager.addLocation(new PreferencesLocation("global"));
	const preferencesLocation = new ContentWindowPreferencesLocation("contentwindow-project", windowManager, DEFAULT_CONTENT_WINDOW_UUID);
	preferencesManager.addLocation(preferencesLocation);

	const assetManager = /** @type {import("../../../../../../../studio/src/assets/AssetManager.js").AssetManager} */ ({
		async getAssetPathFromUuid(uuid) {
			if (uuid == ENTRY_POINT_UUID_1) {
				return ["path", "to", "asset1.json"];
			} else if (uuid == ENTRY_POINT_UUID_2) {
				return ["path", "to", "asset2.json"];
			} else if (uuid == ENTRY_POINT_UUID_3) {
				return ["path", "with", "same", "filename.json"];
			} else if (uuid == ENTRY_POINT_UUID_4) {
				return ["other", "path", "with", "same", "filename.json"];
			} else if (uuid == ENTRY_POINT_UUID_5) {
				// Non existent assets shouldn't show up in the list
				return null;
			}
			return null;
		},
	});

	const mockStudio = /** @type {import("../../../../../../../studio/src/Studio.js").Studio} */ ({});

	mockStudio.preferencesManager = preferencesManager;

	installFakeDocument();
	injectMockStudioInstance(mockStudio);

	/** @type {ConstructorParameters<typeof EntryPointPopover>} */
	const args = [popoverManager, assetManager, preferencesManager, DEFAULT_CONTENT_WINDOW_UUID];
	return {
		args,
		preferencesManager,
		uninstall() {
			uninstallFakeDocument();
			injectMockStudioInstance(null);
		},
	};
}

Deno.test({
	name: "Starts with an empty list",
	fn() {
		const {args, uninstall} = basicTest();
		try {
			const popover = new EntryPointPopover(...args);
			assertEquals(popover.currentSelector, null);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Has the first entry selected when no preference exists",
	async fn() {
		const {args, preferencesManager, uninstall} = basicTest();
		try {
			preferencesManager.set("buildView.availableEntryPoints", [
				ENTRY_POINT_UUID_1,
				ENTRY_POINT_UUID_2,
			]);
			preferencesManager.set("buildView.selectedEntryPoint", "");
			const popover = new EntryPointPopover(...args);
			await waitForMicrotasks();
			assertExists(popover.currentSelector);
			assertEquals(popover.currentSelector.items, [
				"asset1.json",
				"asset2.json",
			]);
			assertEquals(popover.currentSelector.value, "asset1.json");
			assertEquals(getSelectedEntryPoint(preferencesManager, DEFAULT_CONTENT_WINDOW_UUID), ENTRY_POINT_UUID_1);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Loads the list and selected entrypoint",
	async fn() {
		const {args, preferencesManager, uninstall} = basicTest();
		try {
			preferencesManager.set("buildView.availableEntryPoints", [
				ENTRY_POINT_UUID_1,
				ENTRY_POINT_UUID_2,
				ENTRY_POINT_UUID_3,
				ENTRY_POINT_UUID_4,
				ENTRY_POINT_UUID_5,
			]);
			preferencesManager.set("buildView.selectedEntryPoint", ENTRY_POINT_UUID_2);
			const popover = new EntryPointPopover(...args);
			await waitForMicrotasks();
			assertExists(popover.currentSelector);
			assertEquals(popover.currentSelector.items, [
				"asset1.json",
				"asset2.json",
				"path/with/same/filename.json",
				"other/path/with/same/filename.json",
			]);
			assertEquals(popover.currentSelector.value, "asset2.json");
			assertEquals(getSelectedEntryPoint(preferencesManager, DEFAULT_CONTENT_WINDOW_UUID), ENTRY_POINT_UUID_2);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Changes selected entrypoint when clicking",
	async fn() {
		const {args, preferencesManager, uninstall} = basicTest();
		try {
			preferencesManager.set("buildView.availableEntryPoints", [
				ENTRY_POINT_UUID_1,
				ENTRY_POINT_UUID_2,
			]);
			preferencesManager.set("buildView.selectedEntryPoint", "");
			const popover = new EntryPointPopover(...args);
			await waitForMicrotasks();
			assertExists(popover.currentSelector);
			popover.currentSelector.setValue("asset2.json");
			assertEquals(getSelectedEntryPoint(preferencesManager, DEFAULT_CONTENT_WINDOW_UUID), ENTRY_POINT_UUID_2);
		} finally {
			uninstall();
		}
	},
});
