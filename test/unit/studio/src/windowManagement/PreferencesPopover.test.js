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
		unknownPref: {
			type: "unknown",
		},
	});
	const mockWindowManager = /** @type {import("../../../../../studio/src/windowManagement/WindowManager.js").WindowManager} */ ({
		requestContentWindowPreferencesFlush() {},
	});
	const globalLocation = new PreferencesLocation("global");
	preferencesManager.addLocation(globalLocation);
	const contentWindowProjectLocation = new ContentWindowPreferencesLocation("contentwindow-project", mockWindowManager, CONTENT_WINDOW_UUID);
	preferencesManager.addLocation(contentWindowProjectLocation);

	return {popoverManager, preferencesManager};
}

Deno.test({
	name: "Is filled with the initialized preference ids",
	fn() {
		const {popoverManager, preferencesManager} = getMocks();

		runWithDom(() => {
			const popover = new PreferencesPopover(popoverManager, preferencesManager, ["boolPref", "numPref", "strPref"], CONTENT_WINDOW_UUID);

			assertTreeViewStructureEquals(popover.preferencesTreeView, {
				children: [
					{
						propertiesLabel: "Bool Pref",
						isPropertiesEntry: true,
						propertiesType: "boolean",
						propertiesValue: true,
					},
					{
						propertiesLabel: "Num Pref",
						isPropertiesEntry: true,
						propertiesType: "number",
						propertiesValue: 42,
					},
					{
						propertiesLabel: "Str Pref",
						isPropertiesEntry: true,
						propertiesType: "string",
						propertiesValue: "default",
					},
				],
			});
		});
	},
});

Deno.test({
	name: "Changing location updates values",
	fn() {
		const {popoverManager, preferencesManager} = getMocks();

		runWithDom(() => {
			const popover = new PreferencesPopover(popoverManager, preferencesManager, ["boolPref", "numPref", "strPref"], CONTENT_WINDOW_UUID);
			popover.locationDropDown.setValue(1);
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
				],
			});

			popover.locationDropDown.setValue(0);
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
