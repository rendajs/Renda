import {basicTest} from "./shared.js";
import {ContentWindowEntityEditor} from "../../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor.js";
import {assertEquals, assertExists} from "std/testing/asserts.ts";

Deno.test({
	name: "Has an empty entity by default",
	async fn() {
		const {args, uninstall} = basicTest();
		try {
			const contentWindow = new ContentWindowEntityEditor(...args);
			contentWindow.setProjectPreferencesLocationData({});

			assertExists(contentWindow.editingEntity);
			assertEquals(contentWindow.isEditingProjectEntity, false);
		} finally {
			uninstall();
		}
	},
});
