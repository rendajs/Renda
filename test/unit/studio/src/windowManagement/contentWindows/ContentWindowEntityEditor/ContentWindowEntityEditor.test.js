import {BASIC_ENTITY_UUID, basicTest} from "./shared.js";
import {ContentWindowEntityEditor} from "../../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js";
import {assertEquals, assertExists} from "std/testing/asserts.ts";
import {waitForMicrotasks} from "../../../../../shared/waitForMicroTasks.js";
import {assertSpyCalls, spy} from "std/testing/mock.ts";
import {EntityChangeType} from "../../../../../../../studio/src/assets/EntityAssetManager.js";
import {Entity} from "../../../../../../../src/mod.js";

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

Deno.test({
	name: "Rerenders the scene when an entity is changed from another window",
	async fn() {
		const {args, assetManager, uninstall} = basicTest();
		try {
			const entityAssetManager = assetManager.entityAssetManager;
			const contentWindow = new ContentWindowEntityEditor(...args);
			const markDirtySpy = spy(contentWindow, "markRenderDirty");
			let expectedCallCount = 0;
			const entity1 = entityAssetManager.createTrackedEntity(BASIC_ENTITY_UUID);
			const entity2 = entityAssetManager.createTrackedEntity(BASIC_ENTITY_UUID);

			contentWindow.editingEntity = entity1;
			assertSpyCalls(markDirtySpy, ++expectedCallCount);

			// Wait for entity to load
			await waitForMicrotasks();
			// Once for the load event, another for the gizmos that get updated
			expectedCallCount += 2;
			assertSpyCalls(markDirtySpy, expectedCallCount);

			// Updating the entity from another place should trigger the listener
			entity2.name = "name 1";
			entityAssetManager.updateEntity(entity2, EntityChangeType.Rename, null);
			assertSpyCalls(markDirtySpy, ++expectedCallCount);

			// Changes from the entity editor itself are ignored
			entity2.name = "name 2";
			entityAssetManager.updateEntity(entity2, EntityChangeType.Rename, contentWindow);
			assertSpyCalls(markDirtySpy, expectedCallCount);

			// Setting a new entity should unregister the old listener
			const newEntity = new Entity("new entity");
			contentWindow.editingEntity = newEntity;
			assertSpyCalls(markDirtySpy, ++expectedCallCount);

			entity2.name = "name 3";
			entityAssetManager.updateEntity(entity2, EntityChangeType.Rename, null);
			assertSpyCalls(markDirtySpy, expectedCallCount);

			// Setting it back to the tracked entity should start firing events again
			contentWindow.editingEntity = entity1;
			assertSpyCalls(markDirtySpy, ++expectedCallCount);

			entity2.name = "name 4";
			entityAssetManager.updateEntity(entity2, EntityChangeType.Rename, null);
			assertSpyCalls(markDirtySpy, ++expectedCallCount);

			// Destructing the content window should unregister the listener
			contentWindow.destructor();

			entity2.name = "name 5";
			entityAssetManager.updateEntity(entity2, EntityChangeType.Rename, null);
			assertSpyCalls(markDirtySpy, expectedCallCount);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Saves the entity when making a change from the current window",
	fn() {
		throw new Error("todo");
	},
});
