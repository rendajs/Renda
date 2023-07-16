import "../../../../shared/initializeStudio.js";
import {runWithDom} from "../../../../shared/runWithDom.js";
import {MouseEvent} from "fake-dom/FakeMouseEvent.js";
import {HtmlElement} from "fake-dom/FakeHtmlElement.js";
import {PreferencesManager} from "../../../../../../../studio/src/preferences/PreferencesManager.js";
import {Importer} from "fake-imports";
import {assertExists, assertInstanceOf, assertThrows} from "std/testing/asserts.ts";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";

const importer = new Importer(import.meta.url);
importer.makeReal("../../../../../../../studio/src/studioInstance.js");
importer.makeReal("../../../../../../../studio/src/ui/popoverMenus/popoverToggleButton.js");
importer.fakeModule("../../../../../../../studio/src/windowManagement/PreferencesPopover.js", `
export class PreferencesPopover {}
`);

/** @type {import("../../../../../../../studio/src/windowManagement/contentWindows/ContentWindow.js")} */
const ContentWindowMod = await importer.import("../../../../../../../studio/src/windowManagement/contentWindows/ContentWindow.js");
const {ContentWindow} = ContentWindowMod;

/** @type {import("../../../../../../../studio/src/windowManagement/PreferencesPopover.js")} */
const PreferencesPopoverMod = await importer.import("../../../../../../../studio/src/windowManagement/PreferencesPopover.js");
const {PreferencesPopover} = PreferencesPopoverMod;

Deno.test({
	name: "Preferences Button opens a preferences popover",
	fn() {
		runWithDom(() => {
			/** @type {PreferencesManager<any>} */
			const preferencesManager = new PreferencesManager();
			const mockStudioInstance = /** @type {import("../../../../../../../studio/src/Studio.js").Studio} */ ({
				preferencesManager,
				popoverManager: {
					addPopover() {
						return {
							setPos() {},
						};
					},
				},
			});
			const addPopoverSpy = spy(mockStudioInstance.popoverManager, "addPopover");

			const mockWindowManager = /** @type {import("../../../../../../../studio/src/windowManagement/WindowManager.js").WindowManager} */ ({});

			const contentWindow = new ContentWindow(mockStudioInstance, mockWindowManager, "uuid");

			const ids = /** @type {any[]} */ (["id1", "id2"]);
			contentWindow.addPreferencesButton(ids);

			const preferencesButton = contentWindow.topButtonBar.children[1];
			assertExists(preferencesButton);
			assertInstanceOf(preferencesButton, HtmlElement);

			preferencesButton.dispatchEvent(new MouseEvent("click"));

			assertSpyCalls(addPopoverSpy, 1);
			assertSpyCall(addPopoverSpy, 0, {
				args: [
					PreferencesPopover,
					preferencesManager,
					ids,
					"uuid",
				],
			});

			assertThrows(() => {
				contentWindow.addPreferencesButton([]);
			}, Error, "A preferences button has already been added.");
		});
	},
});
