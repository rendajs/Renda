import {basicTest} from "./shared.js";
import {ContentWindowEntityEditor} from "../../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js";
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

Deno.test({
	name: "Shows the grid when toggled",
	async fn() {
		const {args, mockStudioInstance, uninstall} = basicTest();
		try {
			mockStudioInstance.preferencesManager.set("entityEditor.showGrid", false);
			const contentWindow = new ContentWindowEntityEditor(...args);
			contentWindow.setProjectPreferencesLocationData({});

			assertEquals(contentWindow.editorScene.getEntityByName("grid"), null);
			mockStudioInstance.preferencesManager.set("entityEditor.showGrid", true);
			assertExists(contentWindow.editorScene.getEntityByName("grid"));
		} finally {
			uninstall();
		}
	},
});
Deno.test({
	name: "Hides the grid when untoggled",
	async fn() {
		const {args, mockStudioInstance, uninstall} = basicTest();
		try {
			mockStudioInstance.preferencesManager.set("entityEditor.showGrid", true);

			const contentWindow = new ContentWindowEntityEditor(...args);
			contentWindow.setProjectPreferencesLocationData({});

			assertExists(contentWindow.editorScene.getEntityByName("grid"));
			mockStudioInstance.preferencesManager.set("entityEditor.showGrid", false);
			assertEquals(contentWindow.editorScene.getEntityByName("grid"), null);
		} finally {
			uninstall();
		}
	},
});
