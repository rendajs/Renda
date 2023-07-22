import {assertEquals, assertInstanceOf} from "std/testing/asserts.ts";
import {PreferencesManager} from "../../../../../../../studio/src/preferences/PreferencesManager.js";
import {ContentWindowPreferencesLocation} from "../../../../../../../studio/src/preferences/preferencesLocation/ContentWindowPreferencesLocation.js";
import {injectMockStudioInstance} from "../../../../../../../studio/src/studioInstance.js";
import {BASIC_SCRIPT_ENTRY_POINT_BUILTIN_ASSET_UUID, EntryPointPopover, getSelectedEntityEntryPoint, getSelectedScriptEntryPoint} from "../../../../../../../studio/src/windowManagement/contentWindows/ContentWindowBuildView/EntryPointPopover.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {PreferencesLocation} from "../../../../../../../studio/src/preferences/preferencesLocation/PreferencesLocation.js";
import {waitForMicrotasks} from "../../../../../shared/waitForMicroTasks.js";
import {assertTreeViewStructureEquals} from "../../../../shared/treeViewUtil.js";
import {PropertiesTreeViewEntry} from "../../../../../../../studio/src/ui/propertiesTreeView/PropertiesTreeViewEntry.js";
import {ButtonSelectorGui} from "../../../../../../../studio/src/ui/ButtonSelectorGui.js";

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
		"buildView.availableScriptEntryPoints": {
			type: "gui",
			guiOpts: {
				type: "array",
				guiOpts: {
					arrayType: "droppable",
				},
			},
		},
		"buildView.availableEntityEntryPoints": {
			type: "gui",
			guiOpts: {
				type: "array",
				guiOpts: {
					arrayType: "droppable",
				},
			},
		},
		"buildView.selectedScriptEntryPoint": {
			type: "string",
		},
		"buildView.selectedEntityEntryPoint": {
			type: "string",
		},
	});
	preferencesManager.addLocation(new PreferencesLocation("global"));
	const preferencesLocation = new ContentWindowPreferencesLocation("contentwindow-project", windowManager, DEFAULT_CONTENT_WINDOW_UUID);
	preferencesManager.addLocation(preferencesLocation);

	const assetManager = /** @type {import("../../../../../../../studio/src/assets/AssetManager.js").AssetManager} */ ({
		async getProjectAssetFromUuid(uuid) {
			let path;
			if (uuid == ENTRY_POINT_UUID_1) {
				path = ["path", "to", "asset1.json"];
			} else if (uuid == ENTRY_POINT_UUID_2) {
				path = ["path", "to", "asset2.json"];
			} else if (uuid == ENTRY_POINT_UUID_3) {
				path = ["path", "with", "same", "filename.json"];
			} else if (uuid == ENTRY_POINT_UUID_4) {
				path = ["other", "path", "with", "same", "filename.json"];
			} else if (uuid == ENTRY_POINT_UUID_5) {
				// Non existent assets shouldn't show up in the list
				return null;
			}
			if (!path) return null;
			return /** @type {import("../../../../../../../studio/src/assets/ProjectAsset.js").ProjectAssetAny} */ ({
				path,
			});
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

/**
 * @param {import("../../../../../../../studio/src/ui/TreeView.js").TreeView} treeView
 */
function getTreeViewGuis(treeView) {
	const entityEntry = treeView.children[0];
	assertInstanceOf(entityEntry, PropertiesTreeViewEntry);
	const entityGui = entityEntry.gui;
	assertInstanceOf(entityGui, ButtonSelectorGui);

	const scriptEntry = treeView.children[1];
	assertInstanceOf(scriptEntry, PropertiesTreeViewEntry);
	const scriptGui = scriptEntry.gui;
	assertInstanceOf(scriptGui, ButtonSelectorGui);

	return {entityGui, scriptGui};
}

/**
 * @param {import("../../../../../../../studio/src/ui/TreeView.js").TreeView} treeView
 * @param {object} options
 * @param {string} options.entityValue
 * @param {string} options.scriptValue
 * @param {import("../../../../../../../studio/src/ui/ButtonSelectorGui.js").ButtonSelectorGuiOptionsItem[]} options.entityItems
 * @param {import("../../../../../../../studio/src/ui/ButtonSelectorGui.js").ButtonSelectorGuiOptionsItem[]} options.scriptItems
 */
function assertTreeViewState(treeView, {
	entityValue,
	scriptValue,
	entityItems,
	scriptItems,
}) {
	assertTreeViewStructureEquals(treeView, {
		children: [
			{
				isPropertiesEntry: true,
				propertiesLabel: "Entity",
				propertiesType: "buttonSelector",
				propertiesValue: entityValue,
			},
			{
				isPropertiesEntry: true,
				propertiesLabel: "Script",
				propertiesType: "buttonSelector",
				propertiesValue: scriptValue,
			},
		],
	});
	const {entityGui, scriptGui} = getTreeViewGuis(treeView);
	assertEquals(entityGui.items, entityItems);
	assertEquals(scriptGui.items, scriptItems);
}

Deno.test({
	name: "Starts with an empty list",
	fn() {
		const {args, uninstall} = basicTest();
		try {
			const popover = new EntryPointPopover(...args);
			assertTreeViewState(popover.treeView, {
				entityValue: "Current Entity",
				scriptValue: "Default",
				entityItems: ["Current Entity"],
				scriptItems: ["Default"],
			});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Has the default entries selected when no preference exists",
	async fn() {
		const {args, preferencesManager, uninstall} = basicTest();
		try {
			preferencesManager.set("buildView.availableEntityEntryPoints", [
				ENTRY_POINT_UUID_1,
				ENTRY_POINT_UUID_2,
			]);
			preferencesManager.reset("buildView.selectedEntityEntryPoint");
			preferencesManager.set("buildView.availableScriptEntryPoints", [ENTRY_POINT_UUID_3]);
			preferencesManager.reset("buildView.selectedScriptEntryPoint");

			const popover = new EntryPointPopover(...args);
			await waitForMicrotasks();
			assertTreeViewState(popover.treeView, {
				entityValue: "Current Entity",
				scriptValue: "Default",
				entityItems: [
					"Current Entity",
					"asset1.json",
					"asset2.json",
				],
				scriptItems: [
					"Default",
					"filename.json",
				],
			});
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
			preferencesManager.set("buildView.availableEntityEntryPoints", [
				ENTRY_POINT_UUID_1,
				ENTRY_POINT_UUID_2,
				ENTRY_POINT_UUID_3,
				ENTRY_POINT_UUID_4,
				ENTRY_POINT_UUID_5,
			]);
			preferencesManager.set("buildView.selectedEntityEntryPoint", ENTRY_POINT_UUID_2);

			preferencesManager.set("buildView.availableScriptEntryPoints", [
				ENTRY_POINT_UUID_1,
				ENTRY_POINT_UUID_2,
			]);
			preferencesManager.set("buildView.selectedScriptEntryPoint", ENTRY_POINT_UUID_1);

			const popover = new EntryPointPopover(...args);
			await waitForMicrotasks();
			assertTreeViewState(popover.treeView, {
				entityValue: "asset2.json",
				scriptValue: "asset1.json",
				entityItems: [
					"Current Entity",
					"asset1.json",
					"asset2.json",
					"path/with/same/filename.json",
					"other/path/with/same/filename.json",
				],
				scriptItems: [
					"Default",
					"asset1.json",
					"asset2.json",
				],
			});
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
			preferencesManager.set("buildView.availableEntityEntryPoints", [
				ENTRY_POINT_UUID_1,
				ENTRY_POINT_UUID_2,
			]);
			preferencesManager.set("buildView.selectedEntityEntryPoint", "");

			preferencesManager.set("buildView.availableScriptEntryPoints", [
				ENTRY_POINT_UUID_1,
				ENTRY_POINT_UUID_2,
			]);
			preferencesManager.set("buildView.selectedScriptEntryPoint", "");

			const popover = new EntryPointPopover(...args);
			await waitForMicrotasks();
			const {entityGui, scriptGui} = getTreeViewGuis(popover.treeView);
			entityGui.setValue("asset2.json");
			scriptGui.setValue("asset2.json");
			assertEquals(getSelectedEntityEntryPoint(preferencesManager, DEFAULT_CONTENT_WINDOW_UUID), ENTRY_POINT_UUID_2);
			assertEquals(getSelectedScriptEntryPoint(preferencesManager, DEFAULT_CONTENT_WINDOW_UUID), ENTRY_POINT_UUID_2);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "getSelectedScriptEntryPoint() returns the right value",
	fn() {
		const {preferencesManager, uninstall} = basicTest();
		try {
			preferencesManager.set("buildView.availableScriptEntryPoints", [
				ENTRY_POINT_UUID_1,
				ENTRY_POINT_UUID_2,
			]);

			// When no entry point has been selected, it should return the built in asset uuid.
			preferencesManager.reset("buildView.selectedScriptEntryPoint");
			assertEquals(getSelectedScriptEntryPoint(preferencesManager, DEFAULT_CONTENT_WINDOW_UUID), BASIC_SCRIPT_ENTRY_POINT_BUILTIN_ASSET_UUID);

			// Same for an empty string
			preferencesManager.set("buildView.selectedScriptEntryPoint", "");
			assertEquals(getSelectedScriptEntryPoint(preferencesManager, DEFAULT_CONTENT_WINDOW_UUID), BASIC_SCRIPT_ENTRY_POINT_BUILTIN_ASSET_UUID);

			// But when it has been selected, it should return that uuid
			preferencesManager.set("buildView.selectedScriptEntryPoint", ENTRY_POINT_UUID_2);
			assertEquals(getSelectedScriptEntryPoint(preferencesManager, DEFAULT_CONTENT_WINDOW_UUID), ENTRY_POINT_UUID_2);

			// Unless that uuid does not exist in the buildView.availableScriptEntryPoints list.
			preferencesManager.set("buildView.selectedScriptEntryPoint", ENTRY_POINT_UUID_3);
			assertEquals(getSelectedScriptEntryPoint(preferencesManager, DEFAULT_CONTENT_WINDOW_UUID), BASIC_SCRIPT_ENTRY_POINT_BUILTIN_ASSET_UUID);
		} finally {
			uninstall();
		}
	},
});
