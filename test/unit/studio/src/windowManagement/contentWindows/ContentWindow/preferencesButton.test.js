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
importer.fakeModule("../../../../../../../studio/src/windowManagement/PreferencesPopover.js", `
export class PreferencesPopover {}
`);

/** @type {import("../../../../../../../studio/src/windowManagement/contentWindows/ContentWindow.js")} */
const ContentWindowMod = await importer.import("../../../../../../../studio/src/windowManagement/contentWindows/ContentWindow.js");
const {ContentWindow} = ContentWindowMod;

Deno.test({
	name: "Preferences Button",
	fn() {
		runWithDom(() => {
			/** @type {import("../../../../../../../studio/src/windowManagement/PreferencesPopover.js").PreferencesPopover["initialize"]} */
			const spyFn = (preferencesManager, preferenceIds, el, uuid) => {};
			const initializeSpy = spy(spyFn);

			/** @type {PreferencesManager<any>} */
			const preferencesManager = new PreferencesManager();
			const mockStudioInstance = /** @type {import("../../../../../../../studio/src/Studio.js").Studio} */ ({
				preferencesManager,
				popoverManager: {
					createPopover() {
						return {
							initialize: initializeSpy,
						};
					},
				},
			});

			const mockWindowManager = /** @type {import("../../../../../../../studio/src/windowManagement/WindowManager.js").WindowManager} */ ({});

			const contentWindow = new ContentWindow(mockStudioInstance, mockWindowManager, "uuid");

			const ids = /** @type {any[]} */ (["id1", "id2"]);
			contentWindow.addPreferencesButton(...ids);

			const preferencesButton = contentWindow.topButtonBar.children[1];
			assertExists(preferencesButton);
			assertInstanceOf(preferencesButton, HtmlElement);

			preferencesButton.dispatchEvent(new MouseEvent("click"));

			assertSpyCalls(initializeSpy, 1);
			assertSpyCall(initializeSpy, 0, {
				args: [
					preferencesManager,
					ids,
					preferencesButton,
					"uuid",
				],
			});

			assertThrows(() => {
				contentWindow.addPreferencesButton();
			}, Error, "A preferences button has already been added.");
		});
	},
});
