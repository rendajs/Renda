import "../../../shared/initializeStudio.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {ContentWindowOutliner} from "../../../../../../studio/src/windowManagement/contentWindows/ContentWindowOutliner.js";
import {getMockArgs} from "./shared.js";
import {assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {AssertionError, assertEquals, assertExists, assertStrictEquals} from "std/testing/asserts.ts";
import {ENTITY_EDITOR_CONTENT_WINDOW_ID} from "../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js";
import {Entity} from "../../../../../../src/mod.js";
import {assertTreeViewStructureEquals} from "../../../shared/treeViewUtil.js";
import {MouseEvent} from "fake-dom/FakeMouseEvent.js";
import {EntityAssetManager, EntityChangeType} from "../../../../../../studio/src/assets/EntityAssetManager.js";
import {HistoryManager} from "../../../../../../studio/src/misc/HistoryManager.js";
import {createMockKeyboardShortcutManager} from "../../../shared/mockKeyboardShortcutManager.js";
import {waitForMicrotasks} from "../../../../shared/waitForMicroTasks.js";

/**
 * @typedef ContentWindowOutlinerTestContext
 * @property {ConstructorParameters<typeof ContentWindowOutliner>} args
 * @property {import("../../../../../../studio/src/Studio.js").Studio} mockStudioInstance
 * @property {import("../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js").ContentWindowEntityEditor[]} mockEntityEditors
 * @property {import("../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js").ContentWindowEntityEditor} mockEntityEditor
 * @property {import("../../../../../../studio/src/assets/AssetManager.js").AssetManager} mockAssetManager
 * @property {HistoryManager} historyManager
 */

/**
 * @param {object} options
 * @param {number} [options.availableEntityEditors]
 * @param {(context: ContentWindowOutlinerTestContext) => Promise<void> | void} options.fn
 */
async function basictest({
	availableEntityEditors = 1,
	fn,
}) {
	installFakeDocument();
	try {
		const {args, mockWindowManager, mockStudioInstance} = getMockArgs();
		/** @type {import("../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js").ContentWindowEntityEditor[]} */
		const mockEntityEditors = [];
		for (let i = 0; i < availableEntityEditors; i++) {
			mockEntityEditors.push(createMockEntityEditor());
		}
		stub(mockWindowManager, "getContentWindows", function *getContentWindows(contentWindowConstructorOrId) {
			if (contentWindowConstructorOrId == ENTITY_EDITOR_CONTENT_WINDOW_ID) {
				for (const entityEditor of mockEntityEditors) {
					yield entityEditor;
				}
			}
		});
		stub(mockWindowManager, "getMostSuitableContentWindow", () => {
			return mockEntityEditors[0] || null;
		});
		mockStudioInstance.projectManager = /** @type {import("../../../../../../studio/src/projectSelector/ProjectManager.js").ProjectManager} */ ({});
		const assetManager = /** @type {import("../../../../../../studio/src/assets/AssetManager.js").AssetManager} */ ({});
		mockStudioInstance.projectManager.assetManager = assetManager;
		mockStudioInstance.projectManager.assertAssetManagerExists = () => assetManager;
		assetManager.entityAssetManager = new EntityAssetManager(assetManager);

		const {keyboardShortcutManager} = createMockKeyboardShortcutManager();
		const historyManager = new HistoryManager(keyboardShortcutManager);
		mockStudioInstance.historyManager = historyManager;

		await fn({
			args,
			mockStudioInstance,
			mockEntityEditors,
			mockEntityEditor: mockEntityEditors[0],
			mockAssetManager: assetManager,
			historyManager,
		});
	} finally {
		uninstallFakeDocument();
	}
}

function createMockEntityEditor() {
	const entityEditor = /** @type {import("../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js").ContentWindowEntityEditor} */ ({
		editingEntity: new Entity(),
		notifyEntityChanged(entity, type) {},
	});
	return entityEditor;
}

Deno.test({
	name: "Assigns no linked entity editor when none is available",
	async fn() {
		await basictest({
			availableEntityEditors: 0,
			fn({args}) {
				const contentWindow = new ContentWindowOutliner(...args);
				assertEquals(contentWindow.linkedEntityEditor, null);
			},
		});
	},
});

Deno.test({
	name: "Assigns the first available linked entity editor on creation",
	async fn() {
		await basictest({
			fn({args, mockEntityEditors}) {
				const contentWindow = new ContentWindowOutliner(...args);
				assertStrictEquals(contentWindow.linkedEntityEditor, mockEntityEditors[0]);
			},
		});
	},
});

Deno.test({
	name: "Initial treeview represents the hierarchy of the entity",
	async fn() {
		await basictest({
			fn({args, mockEntityEditor}) {
				mockEntityEditor.editingEntity.add(new Entity("child1"));
				const child2 = new Entity("child2");
				child2.add(new Entity("subchild1"));
				child2.add(new Entity("subchild2"));
				mockEntityEditor.editingEntity.add(child2);
				mockEntityEditor.editingEntity.add(new Entity("child3"));

				const contentWindow = new ContentWindowOutliner(...args);
				assertTreeViewStructureEquals(contentWindow.treeView, {
					name: "Entity",
					children: [
						{name: "child1"},
						{
							name: "child2",
							children: [
								{name: "subchild1"},
								{name: "subchild2"},
							],
						},
						{name: "child3"},
					],
				});
			},
		});
	},
});

Deno.test({
	name: "Linked entity assets have a link icon",
	async fn() {
		await basictest({
			fn({args, mockEntityEditor, mockAssetManager}) {
				const childEntity = new Entity();
				mockAssetManager.entityAssetManager.setLinkedAssetUuid(childEntity, "uuid");

				mockEntityEditor.editingEntity.add(childEntity);

				const contentWindow = new ContentWindowOutliner(...args);
				const childTreeView = contentWindow.treeView.children[0];
				assertExists(childTreeView);
				assertEquals(childTreeView.afterEl.childElementCount, 1);
			},
		});
	},
});

Deno.test({
	name: "TreeView is not visible when there is no asset manager",
	async fn() {
		await basictest({
			async fn({args, mockStudioInstance, mockEntityEditor}) {
				mockStudioInstance.projectManager.assetManager = null;
				mockEntityEditor.editingEntity.add(new Entity("child"));

				const contentWindow = new ContentWindowOutliner(...args);
				assertTreeViewStructureEquals(contentWindow.treeView, {
					name: "",
					children: [],
				});
			},
		});
	},
});

Deno.test({
	name: "Treeview is updated when a linked entity asset is changed",
	async fn() {
		await basictest({
			async fn({args, mockEntityEditor, mockAssetManager}) {
				const TRACKED_ENTITY_UUID = "TRACKED_ENTITY_UUID";
				stub(mockAssetManager, "getLiveAsset", async uuid => {
					if (uuid == TRACKED_ENTITY_UUID) {
						const entity = new Entity("tracked entity");
						mockAssetManager.entityAssetManager.setLinkedAssetUuid(entity, TRACKED_ENTITY_UUID);
						return entity;
					}
				});

				const mainEntity = new Entity("main");
				const child1 = new Entity("child1");
				mainEntity.add(child1);
				const trackedEntity1 = mockAssetManager.entityAssetManager.createdTrackedEntity(TRACKED_ENTITY_UUID);
				mainEntity.add(trackedEntity1);

				mockEntityEditor.editingEntity.add(mainEntity);

				const contentWindow = new ContentWindowOutliner(...args);
				assertTreeViewStructureEquals(contentWindow.treeView, {
					name: "Entity",
					children: [
						{
							name: "main",
							children: [
								{name: "child1"},
								{name: "Entity"},
							],
						},
					],
				});

				await waitForMicrotasks();

				assertTreeViewStructureEquals(contentWindow.treeView, {
					name: "Entity",
					children: [
						{
							name: "main",
							children: [
								{name: "child1"},
								{name: "tracked entity"},
							],
						},
					],
				});

				const trackedEntity2 = mockAssetManager.entityAssetManager.createdTrackedEntity(TRACKED_ENTITY_UUID);
				trackedEntity2.add(new Entity("new child"));
				mockAssetManager.entityAssetManager.updateEntity(trackedEntity2, EntityChangeType.Create);

				assertTreeViewStructureEquals(contentWindow.treeView, {
					name: "Entity",
					children: [
						{
							name: "main",
							children: [
								{name: "child1"},
								{
									name: "tracked entity",
									children: [{name: "new child"}],
								},
							],
						},
					],
				});
			},
		});
	},
});

/**
 * @param {ContentWindowOutliner} contentWindow
 */
function clickAddEntityButton(contentWindow) {
	const buttons = Array.from(contentWindow.topButtonBar.children);
	const button = buttons.find(el => "title" in el && el.title == "Add Entity");
	if (!button) {
		throw new AssertionError("Unable to find 'add entity' button");
	}
	button.dispatchEvent(new MouseEvent("click"));
}

Deno.test({
	name: "'+' button creates a new entity on the root when nothing is selected",
	async fn() {
		await basictest({
			fn({args, mockEntityEditor, mockAssetManager}) {
				const notifyEntityChangedSpy = spy(mockEntityEditor, "notifyEntityChanged");
				const updateEntitySpy = spy(mockAssetManager.entityAssetManager, "updateEntity");
				const contentWindow = new ContentWindowOutliner(...args);
				clickAddEntityButton(contentWindow);
				assertTreeViewStructureEquals(contentWindow.treeView, {
					name: "Entity",
					children: [{name: "Entity"}],
				});

				assertSpyCalls(notifyEntityChangedSpy, 1);
				assertStrictEquals(notifyEntityChangedSpy.calls[0].args[0], mockEntityEditor.editingEntity.children[0]);
				assertEquals(notifyEntityChangedSpy.calls[0].args[1], "create");

				assertSpyCalls(updateEntitySpy, 1);
				assertStrictEquals(updateEntitySpy.calls[0].args[0], mockEntityEditor.editingEntity.children[0]);
				assertEquals(updateEntitySpy.calls[0].args[1], EntityChangeType.Create);
			},
		});
	},
});

Deno.test({
	name: "'+' button creates a new entity on the selected entities",
	async fn() {
		await basictest({
			fn({args, mockEntityEditor}) {
				const notifyEntityChangedSpy = spy(mockEntityEditor, "notifyEntityChanged");
				const child1 = new Entity("child1");
				mockEntityEditor.editingEntity.add(child1);
				const child2 = new Entity("child2");
				mockEntityEditor.editingEntity.add(child2);

				const contentWindow = new ContentWindowOutliner(...args);
				contentWindow.treeView.children[0].select();
				contentWindow.treeView.children[1].select();
				clickAddEntityButton(contentWindow);
				assertTreeViewStructureEquals(contentWindow.treeView, {
					name: "Entity",
					children: [
						{
							name: "child1",
							children: [{name: "Entity"}],
						},
						{
							name: "child2",
							children: [{name: "Entity"}],
						},
					],
				});
				assertSpyCalls(notifyEntityChangedSpy, 2);

				assertStrictEquals(notifyEntityChangedSpy.calls[0].args[0], child1.children[0]);
				assertEquals(notifyEntityChangedSpy.calls[0].args[1], "create");

				assertStrictEquals(notifyEntityChangedSpy.calls[1].args[0], child2.children[0]);
				assertEquals(notifyEntityChangedSpy.calls[1].args[1], "create");
			},
		});
	},
});

Deno.test({
	name: "renaming a treeview renames the entity",
	async fn() {
		await basictest({
			fn({args, mockEntityEditor, historyManager, mockAssetManager}) {
				const notifyEntityChangedSpy = spy(mockEntityEditor, "notifyEntityChanged");
				const updateEntitySpy = spy(mockAssetManager.entityAssetManager, "updateEntity");
				const childEntity = new Entity("old name");
				mockEntityEditor.editingEntity.add(childEntity);
				const contentWindow = new ContentWindowOutliner(...args);

				const childTreeView = contentWindow.treeView.children[0];
				assertExists(childTreeView);
				childTreeView.name = "new name";
				childTreeView.fireEvent("namechange", {
					newName: "new name",
					oldName: "old name",
					target: childTreeView,
				});

				assertEquals(childEntity.name, "new name");
				assertSpyCalls(notifyEntityChangedSpy, 1);
				assertStrictEquals(notifyEntityChangedSpy.calls[0].args[0], childEntity);
				assertEquals(notifyEntityChangedSpy.calls[0].args[1], "rename");
				assertSpyCalls(updateEntitySpy, 1);
				assertStrictEquals(updateEntitySpy.calls[0].args[0], childEntity);
				assertEquals(updateEntitySpy.calls[0].args[1], EntityChangeType.Rename);

				historyManager.undo();

				assertSpyCalls(notifyEntityChangedSpy, 2);
				assertEquals(childEntity.name, "old name");
				assertStrictEquals(notifyEntityChangedSpy.calls[1].args[0], childEntity);
				assertEquals(notifyEntityChangedSpy.calls[1].args[1], "rename");
				assertSpyCalls(updateEntitySpy, 2);
				assertStrictEquals(updateEntitySpy.calls[0].args[0], childEntity);
				assertEquals(updateEntitySpy.calls[0].args[1], EntityChangeType.Rename);

				historyManager.redo();

				assertSpyCalls(notifyEntityChangedSpy, 3);
				assertEquals(childEntity.name, "new name");
				assertStrictEquals(notifyEntityChangedSpy.calls[2].args[0], childEntity);
				assertEquals(notifyEntityChangedSpy.calls[2].args[1], "rename");
				assertSpyCalls(updateEntitySpy, 3);
				assertStrictEquals(updateEntitySpy.calls[0].args[0], childEntity);
				assertEquals(updateEntitySpy.calls[0].args[1], EntityChangeType.Rename);
			},
		});
	},
});
