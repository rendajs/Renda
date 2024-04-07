import { BASIC_ENTITY_UUID, basicTest } from "./shared.js";
import { ContentWindowEntityEditor } from "../../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js";
import { assertEquals, assertExists, assertStrictEquals } from "std/testing/asserts.ts";
import { waitForMicrotasks } from "../../../../../../../src/util/waitForMicroTasks.js";
import { assertSpyCalls, spy } from "std/testing/mock.ts";
import { EntityChangeType } from "../../../../../../../studio/src/assets/EntityAssetManager.js";
import { Entity } from "../../../../../../../src/mod.js";

Deno.test({
	name: "Has an empty entity by default",
	async fn() {
		const { args, uninstall } = basicTest();
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
		const { args, mockStudioInstance, uninstall } = basicTest();
		try {
			mockStudioInstance.preferencesManager.set("entityEditor.showGrid", false);
			const contentWindow = new ContentWindowEntityEditor(...args);
			contentWindow.setProjectPreferencesLocationData({});

			assertEquals(contentWindow.editorScene.getChildByName("grid"), null);
			mockStudioInstance.preferencesManager.set("entityEditor.showGrid", true);
			assertExists(contentWindow.editorScene.getChildByName("grid"));
		} finally {
			uninstall();
		}
	},
});
Deno.test({
	name: "Hides the grid when untoggled",
	async fn() {
		const { args, mockStudioInstance, uninstall } = basicTest();
		try {
			mockStudioInstance.preferencesManager.set("entityEditor.showGrid", true);

			const contentWindow = new ContentWindowEntityEditor(...args);
			contentWindow.setProjectPreferencesLocationData({});

			assertExists(contentWindow.editorScene.getChildByName("grid"));
			mockStudioInstance.preferencesManager.set("entityEditor.showGrid", false);
			assertEquals(contentWindow.editorScene.getChildByName("grid"), null);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Rerenders the scene when an entity is changed from another window",
	async fn() {
		const { args, assetManager, uninstall } = basicTest();
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
	name: "Marks the entity as dirty when making a change",
	async fn() {
		const { args, assetManager, uninstall } = basicTest();
		try {
			const entityAssetManager = assetManager.entityAssetManager;
			const contentWindow = new ContentWindowEntityEditor(...args);
			const addDirtyEntitySpy = spy(contentWindow.entitySavingManager, "addDirtyEntity");
			let expectedCallCount = 0;
			const entity = entityAssetManager.createTrackedEntity(BASIC_ENTITY_UUID);

			contentWindow.editingEntity = entity;

			// Wait for entity to load
			await waitForMicrotasks();
			assertSpyCalls(addDirtyEntitySpy, expectedCallCount);

			entityAssetManager.updateEntityTransform(entity, contentWindow);

			assertSpyCalls(addDirtyEntitySpy, ++expectedCallCount);
			assertStrictEquals(addDirtyEntitySpy.calls[expectedCallCount - 1].args[0], entity);

			// Also marks it as dirty when changed from other windows
			// As long as it was the same entity instance that was edited.
			entityAssetManager.updateEntityTransform(entity, null);

			assertSpyCalls(addDirtyEntitySpy, ++expectedCallCount);
			assertStrictEquals(addDirtyEntitySpy.calls[expectedCallCount - 1].args[0], entity);

			// Doesn't mark it as dirty when changed via another instance
			const otherEntity = entityAssetManager.createTrackedEntity(BASIC_ENTITY_UUID);
			entityAssetManager.updateEntityTransform(otherEntity, null);

			assertSpyCalls(addDirtyEntitySpy, expectedCallCount);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Doesn't mark entities as dirty when the entity is not a project asset",
	async fn() {
		const { args, assetManager, uninstall } = basicTest();
		try {
			const entityAssetManager = assetManager.entityAssetManager;
			const contentWindow = new ContentWindowEntityEditor(...args);
			const addDirtyEntitySpy = spy(contentWindow.entitySavingManager, "addDirtyEntity");
			const entity = contentWindow.editingEntity;

			// Wait for entity to load
			await waitForMicrotasks();
			assertSpyCalls(addDirtyEntitySpy, 0);

			entityAssetManager.updateEntityTransform(entity, contentWindow);

			assertSpyCalls(addDirtyEntitySpy, 0);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Starts tracking entity changes once the asset manager loads",
	async fn() {
		const { args, mockStudioInstance, assetManager, uninstall } = basicTest();
		try {
			/** @type {Set<import("../../../../../../../studio/src/projectSelector/ProjectManager.js").OnAssetManagerChangeCallback>} */
			const onLoadCbs = new Set();
			mockStudioInstance.projectManager = /** @type {import("../../../../../../../studio/src/projectSelector/ProjectManager.js").ProjectManager} */ ({
				assetManager: null,
				onAssetManagerChange(cb) {
					onLoadCbs.add(cb);
				},
				removeOnAssetManagerChange(cb) {
					onLoadCbs.delete(cb);
				},
			});

			const entityAssetManager = assetManager.entityAssetManager;
			const contentWindow = new ContentWindowEntityEditor(...args);
			const markDirtySpy = spy(contentWindow, "markRenderDirty");
			let expectedCallCount = 0;

			const entity = contentWindow.editingEntity;

			// Wait for entity to load
			await waitForMicrotasks();
			assertSpyCalls(markDirtySpy, expectedCallCount);

			entityAssetManager.updateEntityTransform(entity, null);

			assertSpyCalls(markDirtySpy, expectedCallCount);

			mockStudioInstance.projectManager.assetManager = assetManager;
			onLoadCbs.forEach((cb) => cb(assetManager));

			entityAssetManager.updateEntityTransform(entity, null);

			// Once for the load event, another for the gizmos that get updated
			expectedCallCount += 2;
			assertSpyCalls(markDirtySpy, expectedCallCount);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Changes editingEntityUuid when it becomes a saved entity asset",
	async fn() {
		const { args, assetManager, entityEditorUpdatedSpy, uninstall } = basicTest();
		try {
			const contentWindow = new ContentWindowEntityEditor(...args);
			const entityAssetManager = assetManager.entityAssetManager;
			const entity = contentWindow.editingEntity;

			assertEquals(contentWindow.editingEntityUuid, null);

			assertSpyCalls(entityEditorUpdatedSpy, 0);

			entityAssetManager.replaceTrackedEntity(BASIC_ENTITY_UUID, entity);

			await waitForMicrotasks();

			assertEquals(contentWindow.editingEntityUuid, BASIC_ENTITY_UUID);
			assertSpyCalls(entityEditorUpdatedSpy, 1);
			assertStrictEquals(entityEditorUpdatedSpy.calls[0].args[0].target, contentWindow);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Unregisters onAssetManagerChange when destructed",
	async fn() {
		const { args, mockStudioInstance, assetManager, uninstall } = basicTest();
		try {
			/** @type {Set<import("../../../../../../../studio/src/projectSelector/ProjectManager.js").OnAssetManagerChangeCallback>} */
			const onLoadCbs = new Set();
			mockStudioInstance.projectManager = /** @type {import("../../../../../../../studio/src/projectSelector/ProjectManager.js").ProjectManager} */ ({
				assetManager: null,
				onAssetManagerChange(cb) {
					onLoadCbs.add(cb);
				},
				removeOnAssetManagerChange(cb) {
					onLoadCbs.delete(cb);
				},
			});

			const entityAssetManager = assetManager.entityAssetManager;
			const contentWindow = new ContentWindowEntityEditor(...args);
			const markDirtySpy = spy(contentWindow, "markRenderDirty");

			const entity = contentWindow.editingEntity;

			// Wait for entity to load
			await waitForMicrotasks();
			assertSpyCalls(markDirtySpy, 0);

			entityAssetManager.updateEntityTransform(entity, null);

			assertSpyCalls(markDirtySpy, 0);

			contentWindow.destructor();

			mockStudioInstance.projectManager.assetManager = assetManager;
			onLoadCbs.forEach((cb) => cb(assetManager));

			entityAssetManager.updateEntityTransform(entity, null);

			assertSpyCalls(markDirtySpy, 0);
		} finally {
			uninstall();
		}
	},
});
