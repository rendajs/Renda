import {stub} from "std/testing/mock.ts";
import {assertStrictEquals} from "std/testing/asserts.ts";
import {PreferencesManager} from "../../../../../studio/src/preferences/PreferencesManager.js";
import {PreferencesPopover} from "../../../../../studio/src/windowManagement/PreferencesPopover.js";
import {runWithDom} from "../../shared/runWithDom.js";
import {ContentWindowPreferencesLocation} from "../../../../../studio/src/preferences/preferencesLocation/ContentWindowPreferencesLocation.js";
import {PreferencesLocation} from "../../../../../studio/src/preferences/preferencesLocation/PreferencesLocation.js";
import {assertTreeViewStructureEquals} from "../../shared/treeViewUtil.js";

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
		},
		numPref: {
			type: "number",
		},
		strPref: {
			type: "string",
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
			const popover = new PreferencesPopover(popoverManager);
			const setPosSpy = stub(popover, "setPos", () => {});
			popover.initialize(preferencesManager, ["boolPref", "numPref", "strPref"], mockButton, CONTENT_WINDOW_UUID);
			assertStrictEquals(setPosSpy.calls[0].args[0], mockButton);

			assertTreeViewStructureEquals(popover.preferencesTreeView, {
				children: [
					{
						propertiesLabel: "Bool Pref",
						isPropertiesEntry: true,
						propertiesType: "boolean",
					},
					{
						propertiesLabel: "Num Pref",
						isPropertiesEntry: true,
						propertiesType: "number",
					},
					{
						propertiesLabel: "Str Pref",
						isPropertiesEntry: true,
						propertiesType: "string",
					},
				],
			});
		});
	},
});
