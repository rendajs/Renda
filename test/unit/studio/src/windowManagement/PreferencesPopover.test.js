import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";
import {assertInstanceOf, assertThrows} from "std/testing/asserts.ts";
import {PreferencesManager} from "../../../../../studio/src/preferences/PreferencesManager.js";
import {PreferencesPopover} from "../../../../../studio/src/windowManagement/PreferencesPopover.js";
import {runWithDom} from "../../shared/runWithDom.js";
import {ContentWindowPreferencesLocation} from "../../../../../studio/src/preferences/preferencesLocation/ContentWindowPreferencesLocation.js";
import {PreferencesLocation} from "../../../../../studio/src/preferences/preferencesLocation/PreferencesLocation.js";
import {assertTreeViewStructureEquals} from "../../shared/treeViewUtil.js";
import {PropertiesTreeViewEntry} from "../../../../../studio/src/ui/propertiesTreeView/PropertiesTreeViewEntry.js";

function getMockPopoverManager() {
	return /** @type {import("../../../../../studio/src/ui/popoverMenus/PopoverManager.js").PopoverManager} */ ({});
}

const CONTENT_WINDOW_UUID = "content window uuid";

function getMocks() {
	const popoverManager = getMockPopoverManager();
	const preferencesManager = new PreferencesManager({
		boolPref: {
			type: "boolean",
			default: true,
		},
		numPref: {
			type: "number",
			default: 42,
		},
		strPref: {
			type: "string",
			default: "default",
		},
		guiPref: {
			type: "gui",
			guiOpts: {
				type: "number",
			},
		},
		guiPrefWithCustomLabel: {
			type: "gui",
			guiOpts: {
				type: "string",
				label: "This should get replaced",
			},
		},
		guiPrefWithoutOpts: {
			type: "gui",
		},
		unknownPref: {
			type: "unknown",
		},
		allowedLocationsPref: {
			type: "string",
			defaultLocation: "contentwindow-project",
			allowedLocations: ["contentwindow-project"],
		},
	});
	const mockWindowManager = /** @type {import("../../../../../studio/src/windowManagement/WindowManager.js").WindowManager} */ ({
		requestContentWindowProjectPreferencesFlush() {},
	});
	const globalLocation = new PreferencesLocation("global");
	preferencesManager.addLocation(globalLocation);
	const workspaceLocation = new PreferencesLocation("workspace");
	preferencesManager.addLocation(workspaceLocation);
	const versionControlLocation = new PreferencesLocation("version-control");
	preferencesManager.addLocation(versionControlLocation);
	const projectLocation = new PreferencesLocation("project");
	preferencesManager.addLocation(projectLocation);
	const contentWindowProjectLocation = new ContentWindowPreferencesLocation("contentwindow-project", mockWindowManager, CONTENT_WINDOW_UUID);
	preferencesManager.addLocation(contentWindowProjectLocation);
	const contentWindowWorkspaceLocation = new ContentWindowPreferencesLocation("contentwindow-workspace", mockWindowManager, CONTENT_WINDOW_UUID);
	preferencesManager.addLocation(contentWindowWorkspaceLocation);

	return {popoverManager, preferencesManager};
}

Deno.test({
	name: "Is filled with the initialized preference ids",
	fn() {
		const {popoverManager, preferencesManager} = getMocks();

		runWithDom(() => {
			const popover = new PreferencesPopover(popoverManager, preferencesManager, ["boolPref", "numPref", "strPref", "guiPref", "guiPrefWithCustomLabel", "allowedLocationsPref"], CONTENT_WINDOW_UUID);

			assertTreeViewStructureEquals(popover.preferencesTreeView, {
				children: [
					{
						propertiesLabel: "Bool Pref",
						isPropertiesEntry: true,
						propertiesType: "boolean",
						propertiesValue: true,
						disabled: false,
						propertiesTooltip: "Default value: true\nDefault location: Global\nFinal value: true",
					},
					{
						propertiesLabel: "Num Pref",
						isPropertiesEntry: true,
						propertiesType: "number",
						propertiesValue: 42,
						disabled: false,
						propertiesTooltip: "Default value: 42\nDefault location: Global\nFinal value: 42",
					},
					{
						propertiesLabel: "Str Pref",
						isPropertiesEntry: true,
						propertiesType: "string",
						propertiesValue: "default",
						disabled: false,
						propertiesTooltip: 'Default value: "default"\nDefault location: Global\nFinal value: "default"',
					},
					{
						propertiesLabel: "Gui Pref",
						isPropertiesEntry: true,
						propertiesType: "number",
						propertiesValue: undefined,
						disabled: false,
						propertiesTooltip: "Default location: Global",
					},
					{
						propertiesLabel: "Gui Pref With Custom Label",
						isPropertiesEntry: true,
						propertiesType: "string",
						propertiesValue: undefined,
						disabled: false,
						propertiesTooltip: "Default location: Global",
					},
					{
						propertiesLabel: "Allowed Locations Pref",
						isPropertiesEntry: true,
						propertiesType: "string",
						propertiesValue: "",
						disabled: false,
						propertiesTooltip: 'Default value: ""\nDefault location: Window - Project\nFinal value: ""',
					},
				],
			});
		});
	},
});

Deno.test({
	name: "Adding a gui pref with missing guiOpts throws",
	fn() {
		const {popoverManager, preferencesManager} = getMocks();

		runWithDom(() => {
			assertThrows(() => {
				new PreferencesPopover(popoverManager, preferencesManager, ["guiPrefWithoutOpts"], CONTENT_WINDOW_UUID);
			}, Error, 'Preference type of "guiPrefWithoutOpts" is "gui" but no guiOpts was set in the preference config.');
		});
	},
});

Deno.test({
	name: "Changing location updates values",
	fn() {
		const {popoverManager, preferencesManager} = getMocks();

		runWithDom(() => {
			const popover = new PreferencesPopover(popoverManager, preferencesManager, ["boolPref", "numPref", "strPref", "allowedLocationsPref"], CONTENT_WINDOW_UUID);
			popover.locationDropDown.setValue(1); // Global
			popover.locationDropDown.el.dispatchEvent(new Event("change"));

			assertTreeViewStructureEquals(popover.preferencesTreeView, {
				children: [
					{
						propertiesValue: false,
					},
					{
						propertiesValue: 0,
					},
					{
						propertiesValue: "",
					},
					{
						disabled: true,
					},
				],
			});

			popover.locationDropDown.setValue(0); // Default
			popover.locationDropDown.el.dispatchEvent(new Event("change"));
			assertTreeViewStructureEquals(popover.preferencesTreeView, {
				children: [
					{
						propertiesValue: true,
					},
					{
						propertiesValue: 42,
					},
					{
						propertiesValue: "default",
					},
					{
						disabled: false,
					},
				],
			});
		});
	},
});

Deno.test({
	name: "Values changed via ui are saved",
	fn() {
		const {popoverManager, preferencesManager} = getMocks();
		const setSpy = spy(preferencesManager, "set");

		runWithDom(() => {
			const popover = new PreferencesPopover(popoverManager, preferencesManager, ["numPref"], CONTENT_WINDOW_UUID);
			const numEntry = popover.preferencesTreeView.children[0];

			assertInstanceOf(numEntry, PropertiesTreeViewEntry);
			assertSpyCalls(setSpy, 0);
			numEntry.setValue(123, {trigger: "user"});
			assertSpyCalls(setSpy, 1);
			assertSpyCall(setSpy, 0, {
				args: [
					"numPref", 123, {
						location: null,
						contentWindowUuid: CONTENT_WINDOW_UUID,
					},
				],
			});

			popover.locationDropDown.setValue(1);
			popover.locationDropDown.el.dispatchEvent(new Event("change"));

			numEntry.setValue(456, {trigger: "user"});
			assertSpyCalls(setSpy, 2);
			assertSpyCall(setSpy, 1, {
				args: [
					"numPref", 456, {
						location: "global",
						contentWindowUuid: CONTENT_WINDOW_UUID,
					},
				],
			});

			popover.locationDropDown.setValue(0);
			popover.locationDropDown.el.dispatchEvent(new Event("change"));

			numEntry.setValue(789, {trigger: "user"});
			assertSpyCalls(setSpy, 3);
			assertSpyCall(setSpy, 2, {
				args: [
					"numPref", 789, {
						location: null,
						contentWindowUuid: CONTENT_WINDOW_UUID,
					},
				],
			});
		});
	},
});

Deno.test({
	name: "Throws when a preference with 'unknown' type is added",
	fn() {
		const {popoverManager, preferencesManager} = getMocks();

		runWithDom(() => {
			assertThrows(() => {
				new PreferencesPopover(popoverManager, preferencesManager, ["unknownPref"], CONTENT_WINDOW_UUID);
			}, Error, "Preferences with unknown type can not be added to PreferencesPopovers.");
		});
	},
});

Deno.test({
	name: "Default location tooltip is only shown when default location is selected",
	fn() {
		const {popoverManager, preferencesManager} = getMocks();

		runWithDom(() => {
			const popover = new PreferencesPopover(popoverManager, preferencesManager, ["boolPref", "allowedLocationsPref"], CONTENT_WINDOW_UUID);
			popover.locationDropDown.setValue(1); // Global
			popover.locationDropDown.el.dispatchEvent(new Event("change"));

			assertTreeViewStructureEquals(popover.preferencesTreeView, {
				children: [
					{
						propertiesTooltip: "Default value: true\nFinal value: true",
					},
					{
						propertiesTooltip: 'Default value: ""\nFinal value: ""',
					},
				],
			});

			popover.locationDropDown.setValue(0); // Default
			popover.locationDropDown.el.dispatchEvent(new Event("change"));
			assertTreeViewStructureEquals(popover.preferencesTreeView, {
				children: [
					{
						propertiesTooltip: "Default value: true\nDefault location: Global\nFinal value: true",
					},
					{
						propertiesTooltip: 'Default value: ""\nDefault location: Window - Project\nFinal value: ""',
					},
				],
			});
		});
	},
});

Deno.test({
	name: "Shows modified locations in tooltip",
	fn() {
		const {popoverManager, preferencesManager} = getMocks();

		runWithDom(() => {
			const popover = new PreferencesPopover(popoverManager, preferencesManager, ["numPref"], CONTENT_WINDOW_UUID);
			const numEntry = popover.preferencesTreeView.children[0];
			assertInstanceOf(numEntry, PropertiesTreeViewEntry);

			assertTreeViewStructureEquals(popover.preferencesTreeView, {
				children: [
					{
						propertiesTooltip: `Default value: 42
Default location: Global
Final value: 42`,
					},
				],
			});

			numEntry.setValue(123, {trigger: "user"});

			assertTreeViewStructureEquals(popover.preferencesTreeView, {
				children: [
					{
						propertiesTooltip: `Default value: 42
Default location: Global
Modified in: Global
Final value: 123`,
					},
				],
			});

			popover.locationDropDown.setValue(1); // Global
			popover.locationDropDown.el.dispatchEvent(new Event("change"));

			assertTreeViewStructureEquals(popover.preferencesTreeView, {
				children: [
					{
						propertiesTooltip: `Default value: 42
Modified in: Global
Final value: 123`,
					},
				],
			});

			numEntry.setValue(456, {trigger: "user"});

			assertTreeViewStructureEquals(popover.preferencesTreeView, {
				children: [
					{
						propertiesTooltip: `Default value: 42
Modified in: Global
Final value: 456`,
					},
				],
			});

			popover.locationDropDown.setValue(2); // Workspace
			popover.locationDropDown.el.dispatchEvent(new Event("change"));

			assertTreeViewStructureEquals(popover.preferencesTreeView, {
				children: [
					{
						propertiesTooltip: `Default value: 42
Modified in: Global
Final value: 456`,
					},
				],
			});

			numEntry.setValue(789, {trigger: "user"});

			assertTreeViewStructureEquals(popover.preferencesTreeView, {
				children: [
					{
						propertiesTooltip: `Default value: 42
Modified in: Global, Workspace
Final value: 789`,
					},
				],
			});
		});
	},
});
