import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {assertInstanceOf, assertStrictEquals, assertThrows} from "std/testing/asserts.ts";
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

const mockButton = /** @type {HTMLElement} */ ({});

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

/**
 * @param {import("../../../../../studio/src/ui/popoverMenus/PopoverManager.js").PopoverManager} popoverManager
 * @param {PreferencesManager<any>} preferencesManager
 * @param {string[]} prefIds
 */
function initializePopover(popoverManager, preferencesManager, prefIds) {
	const popover = new PreferencesPopover(popoverManager);
	const setPosSpy = stub(popover, "setPos", () => {});
	popover.initialize(preferencesManager, prefIds, mockButton, CONTENT_WINDOW_UUID);

	return {
		popover,
		setPosSpy,
	};
}

Deno.test({
	name: "Is filled with the initialized preference ids",
	fn() {
		const {popoverManager, preferencesManager} = getMocks();

		runWithDom(() => {
			const {popover, setPosSpy} = initializePopover(popoverManager, preferencesManager, ["boolPref", "numPref", "strPref"]);
			assertStrictEquals(setPosSpy.calls[0].args[0], mockButton);

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
	name: "Can only be initialized once",
	fn() {
		const {popoverManager, preferencesManager} = getMocks();

		runWithDom(() => {
			const {popover} = initializePopover(popoverManager, preferencesManager, ["boolPref"]);
			assertThrows(() => {
				popover.initialize(preferencesManager, ["numPref"], mockButton, "other uuid");
			}, Error, "Already initialized");
		});
	},
});

Deno.test({
	name: "Changing location updates values",
	fn() {
		const {popoverManager, preferencesManager} = getMocks();

		runWithDom(() => {
			const {popover} = initializePopover(popoverManager, preferencesManager, ["boolPref", "numPref", "strPref"]);
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
			const {popover} = initializePopover(popoverManager, preferencesManager, ["numPref"]);
			const numEntry = popover.preferencesTreeView.children[0];

			assertInstanceOf(numEntry, PropertiesTreeViewEntry);
			assertSpyCalls(setSpy, 0);
			numEntry.setValue(123);
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

			numEntry.setValue(456);
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

			numEntry.setValue(789);
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
