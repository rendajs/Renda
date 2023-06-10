import "../../../shared/initializeStudio.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {ContentWindowOutliner} from "../../../../../../studio/src/windowManagement/contentWindows/ContentWindowOutliner.js";
import {getMockArgs} from "./shared.js";
import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {AssertionError, assertEquals, assertExists, assertStrictEquals} from "std/testing/asserts.ts";
import {ENTITY_EDITOR_CONTENT_WINDOW_ID} from "../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js";
import {Entity} from "../../../../../../src/mod.js";
import {assertTreeViewStructureEquals} from "../../../shared/treeViewUtil.js";
import {MouseEvent} from "fake-dom/FakeMouseEvent.js";
import {EntityAssetManager, EntityChangeType} from "../../../../../../studio/src/assets/EntityAssetManager.js";
import {HistoryManager} from "../../../../../../studio/src/misc/HistoryManager.js";
import {createMockKeyboardShortcutManager} from "../../../shared/mockKeyboardShortcutManager.js";
import {waitForMicrotasks} from "../../../../shared/waitForMicroTasks.js";
import {DragEvent} from "fake-dom/FakeDragEvent.js";
import {DragManager} from "../../../../../../studio/src/misc/DragManager.js";
import {parseMimeType} from "../../../../../../studio/src/util/util.js";
import {createMockPopoverManager, triggerContextMenuItem} from "../../../shared/contextMenuHelpers.js";
import {injectMockStudioInstance} from "../../../../../../studio/src/studioInstance.js";
import {ProjectAssetTypeEntity} from "../../../../../../studio/src/assets/projectAssetType/ProjectAssetTypeEntity.js";
import {createMockProjectAsset} from "../../../shared/createMockProjectAsset.js";
import {EventHandler} from "../../../../../../src/util/EventHandler.js";

/**
 * @typedef ContentWindowOutlinerTestContext
 * @property {ConstructorParameters<typeof ContentWindowOutliner>} args
 * @property {import("../../../../../../studio/src/Studio.js").Studio} mockStudioInstance
 * @property {import("../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js").ContentWindowEntityEditor[]} mockEntityEditors
 * @property {import("../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js").ContentWindowEntityEditor} mockEntityEditor
 * @property {import("../../../../../../studio/src/assets/AssetManager.js").AssetManager} mockAssetManager
 * @property {HistoryManager} historyManager
 * @property {DragManager} dragManager
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
		mockWindowManager.contentWindowAddedHandler = new EventHandler();
		mockWindowManager.contentWindowRemovedHandler = new EventHandler();
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
		mockStudioInstance.projectManager.getAssetManager = async () => assetManager;
		mockStudioInstance.projectManager.assertAssetManagerExists = () => assetManager;
		mockStudioInstance.projectManager.onAssetManagerChange = cb => {};
		mockStudioInstance.projectManager.removeOnAssetManagerChange = cb => {};
		assetManager.entityAssetManager = new EntityAssetManager(assetManager);

		const dragManager = new DragManager();
		mockStudioInstance.dragManager = dragManager;

		const {keyboardShortcutManager} = createMockKeyboardShortcutManager();
		const historyManager = new HistoryManager(keyboardShortcutManager);
		mockStudioInstance.historyManager = historyManager;

		injectMockStudioInstance(mockStudioInstance);

		await fn({
			args,
			mockStudioInstance,
			mockEntityEditors,
			mockEntityEditor: mockEntityEditors[0],
			mockAssetManager: assetManager,
			historyManager,
			dragManager,
		});
	} finally {
		uninstallFakeDocument();
		injectMockStudioInstance(null);
	}
}

function createMockEntityEditor() {
	const entityEditor = /** @type {import("../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js").ContentWindowEntityEditor} */ ({
		editingEntity: new Entity(),
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
	name: "TreeView is not visible until there is an asset manager",
	async fn() {
		await basictest({
			async fn({args, mockStudioInstance, mockEntityEditor}) {
				const assetManager = mockStudioInstance.projectManager.assetManager;
				assertExists(assetManager);
				mockStudioInstance.projectManager.assetManager = null;
				/** @type {Set<import("../../../../../../studio/src/projectSelector/ProjectManager.js").OnAssetManagerChangeCallback>} */
				const cbs = new Set();
				mockStudioInstance.projectManager.onAssetManagerChange = cb => cbs.add(cb);
				mockEntityEditor.editingEntity.add(new Entity("child"));

				const contentWindow = new ContentWindowOutliner(...args);
				assertTreeViewStructureEquals(contentWindow.treeView, {
					name: "",
					children: [],
				});

				mockStudioInstance.projectManager.assetManager = assetManager;
				cbs.forEach(cb => cb(assetManager));

				assertTreeViewStructureEquals(contentWindow.treeView, {
					name: "Entity",
					children: [
						{
							name: "child",
						},
					],
				});
			},
		});
	},
});

Deno.test({
	name: "Destructor removes onAssetManagerChange callback",
	async fn() {
		await basictest({
			async fn({args, mockStudioInstance, mockEntityEditor}) {
				const assetManager = mockStudioInstance.projectManager.assetManager;
				assertExists(assetManager);
				mockStudioInstance.projectManager.assetManager = null;
				/** @type {Set<import("../../../../../../studio/src/projectSelector/ProjectManager.js").OnAssetManagerChangeCallback>} */
				const cbs = new Set();
				mockStudioInstance.projectManager.onAssetManagerChange = cb => cbs.add(cb);
				mockEntityEditor.editingEntity.add(new Entity("child"));

				const contentWindow = new ContentWindowOutliner(...args);

				contentWindow.destructor();

				mockStudioInstance.projectManager.assetManager = assetManager;
				cbs.forEach(cb => cb(assetManager));

				assertTreeViewStructureEquals(contentWindow.treeView, {
					name: "",
					children: [],
				});
			},
		});
	},
});

/**
 * @param {import("../../../../../../studio/src/assets/AssetManager.js").AssetManager} assetManager
 */
function setupTrackedEntityTest(assetManager) {
	const TRACKED_ENTITY_UUID = "TRACKED_ENTITY_UUID";
	stub(assetManager, "getLiveAsset", async uuid => {
		if (uuid == TRACKED_ENTITY_UUID) {
			const entity = new Entity("tracked entity");
			assetManager.entityAssetManager.setLinkedAssetUuid(entity, TRACKED_ENTITY_UUID);
			return entity;
		}
	});

	return {TRACKED_ENTITY_UUID};
}

Deno.test({
	name: "Treeview is updated when a linked entity asset is changed",
	async fn() {
		await basictest({
			async fn({args, mockEntityEditor, mockAssetManager}) {
				const {TRACKED_ENTITY_UUID} = setupTrackedEntityTest(mockAssetManager);

				const mainEntity = new Entity("main");
				const child1 = new Entity("child1");
				mainEntity.add(child1);
				const trackedEntity1 = mockAssetManager.entityAssetManager.createTrackedEntity(TRACKED_ENTITY_UUID);
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

				const trackedEntity2 = mockAssetManager.entityAssetManager.createTrackedEntity(TRACKED_ENTITY_UUID);
				trackedEntity2.add(new Entity("new child"));
				mockAssetManager.entityAssetManager.updateEntity(trackedEntity2, EntityChangeType.Create, null);

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
				const updateEntitySpy = spy(mockAssetManager.entityAssetManager, "updateEntity");
				const contentWindow = new ContentWindowOutliner(...args);
				clickAddEntityButton(contentWindow);
				assertTreeViewStructureEquals(contentWindow.treeView, {
					name: "Entity",
					children: [{name: "Entity"}],
				});

				assertSpyCalls(updateEntitySpy, 1);
				assertStrictEquals(updateEntitySpy.calls[0].args[0], mockEntityEditor.editingEntity);
				assertEquals(updateEntitySpy.calls[0].args[1], EntityChangeType.Create);
				assertEquals(updateEntitySpy.calls[0].args[2], contentWindow);
			},
		});
	},
});

Deno.test({
	name: "'+' button creates a new entity on the selected entities",
	async fn() {
		await basictest({
			fn({args, mockEntityEditor, mockAssetManager}) {
				const updateEntitySpy = spy(mockAssetManager.entityAssetManager, "updateEntity");
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
				assertSpyCalls(updateEntitySpy, 2);

				assertStrictEquals(updateEntitySpy.calls[0].args[0], child1);
				assertEquals(updateEntitySpy.calls[0].args[1], EntityChangeType.Create);

				assertStrictEquals(updateEntitySpy.calls[1].args[0], child2);
				assertEquals(updateEntitySpy.calls[1].args[1], EntityChangeType.Create);
			},
		});
	},
});

Deno.test({
	name: "renaming a treeview renames the entity",
	async fn() {
		await basictest({
			fn({args, mockEntityEditor, historyManager, mockAssetManager}) {
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
				assertSpyCalls(updateEntitySpy, 1);
				assertStrictEquals(updateEntitySpy.calls[0].args[0], childEntity);
				assertEquals(updateEntitySpy.calls[0].args[1], EntityChangeType.Rename);
				assertEquals(updateEntitySpy.calls[0].args[2], contentWindow);

				historyManager.undo();

				assertEquals(childEntity.name, "old name");
				assertSpyCalls(updateEntitySpy, 2);
				assertStrictEquals(updateEntitySpy.calls[1].args[0], childEntity);
				assertEquals(updateEntitySpy.calls[1].args[1], EntityChangeType.Rename);
				assertEquals(updateEntitySpy.calls[1].args[2], contentWindow);

				historyManager.redo();

				assertEquals(childEntity.name, "new name");
				assertSpyCalls(updateEntitySpy, 3);
				assertStrictEquals(updateEntitySpy.calls[2].args[0], childEntity);
				assertEquals(updateEntitySpy.calls[2].args[1], EntityChangeType.Rename);
				assertEquals(updateEntitySpy.calls[2].args[2], contentWindow);
			},
		});
	},
});

Deno.test({
	name: "Renaming a treeview of a linked entity asset updates the other instances as well",
	async fn() {
		await basictest({
			async fn({args, mockEntityEditor, mockAssetManager}) {
				const {TRACKED_ENTITY_UUID} = setupTrackedEntityTest(mockAssetManager);

				const trackedEntity1 = mockAssetManager.entityAssetManager.createTrackedEntity(TRACKED_ENTITY_UUID);
				mockEntityEditor.editingEntity.add(trackedEntity1);
				const trackedEntity2 = mockAssetManager.entityAssetManager.createTrackedEntity(TRACKED_ENTITY_UUID);
				mockEntityEditor.editingEntity.add(trackedEntity2);

				const contentWindow = new ContentWindowOutliner(...args);
				await waitForMicrotasks();

				assertTreeViewStructureEquals(contentWindow.treeView, {
					name: "Entity",
					children: [
						{name: "tracked entity"},
						{name: "tracked entity"},
					],
				});

				const childTreeView = contentWindow.treeView.children[0];
				assertExists(childTreeView);
				childTreeView.name = "new name";
				childTreeView.fireEvent("namechange", {
					newName: "new name",
					oldName: "old name",
					target: childTreeView,
				});

				assertTreeViewStructureEquals(contentWindow.treeView, {
					name: "Entity",
					children: [
						{name: "new name"},
						{name: "new name"},
					],
				});
			},
		});
	},
});

Deno.test({
	name: "Dragging treeviews assigns data about the entity that was dragged",
	async fn() {
		await basictest({
			fn({args, mockEntityEditor, dragManager}) {
				const childEntity = mockEntityEditor.editingEntity.add(new Entity("child"));

				const contentWindow = new ContentWindowOutliner(...args);
				const treeView = contentWindow.treeView.children[0];
				const dragEvent = new DragEvent("dragstart");
				treeView.rowEl.dispatchEvent(dragEvent);

				const types = Array.from(dragEvent.dataTransfer.types);
				assertEquals(types.length, 2);
				const parsed = parseMimeType(types[1]);
				assertExists(parsed);
				assertEquals(parsed.type, "text");
				assertEquals(parsed.subType, "renda");
				assertEquals(parsed.parameters.dragtype, "outlinertreeview");
				const draggingData = dragManager.getDraggingData(parsed.parameters.draggingdata);
				assertStrictEquals(draggingData, childEntity);

				// Data is removed when the drag event ends
				treeView.rowEl.dispatchEvent(new DragEvent("dragend"));

				const draggingData2 = dragManager.getDraggingData(parsed.parameters.draggingdata);
				assertEquals(draggingData2, undefined);
			},
		});
	},
});

Deno.test({
	name: "Deleting entity via context menu",
	async fn() {
		await basictest({
			async fn({args, mockEntityEditor, historyManager, mockStudioInstance, mockAssetManager}) {
				const {mockPopoverManager, getLastCreatedStructure} = createMockPopoverManager();
				mockStudioInstance.popoverManager = mockPopoverManager;

				const updateEntitySpy = spy(mockAssetManager.entityAssetManager, "updateEntity");
				const childEntity = new Entity("delete me");
				mockEntityEditor.editingEntity.add(childEntity);
				const contentWindow = new ContentWindowOutliner(...args);

				const childTreeView = contentWindow.treeView.children[0];
				assertExists(childTreeView);

				childTreeView.rowEl.dispatchEvent(new MouseEvent("contextmenu"));
				await waitForMicrotasks();

				const structure = getLastCreatedStructure();

				triggerContextMenuItem(structure, ["Delete"]);

				assertEquals(mockEntityEditor.editingEntity.childCount, 0);
				assertEquals(contentWindow.treeView.children.length, 0);
				assertSpyCalls(updateEntitySpy, 1);
				assertStrictEquals(updateEntitySpy.calls[0].args[0], mockEntityEditor.editingEntity);
				assertEquals(updateEntitySpy.calls[0].args[1], EntityChangeType.Delete);
				assertEquals(updateEntitySpy.calls[0].args[2], contentWindow);

				historyManager.undo();

				assertEquals(mockEntityEditor.editingEntity.childCount, 1);
				assertEquals(contentWindow.treeView.children.length, 1);
				assertSpyCalls(updateEntitySpy, 2);
				assertStrictEquals(updateEntitySpy.calls[1].args[0], mockEntityEditor.editingEntity);
				assertEquals(updateEntitySpy.calls[1].args[1], EntityChangeType.Create);
				assertEquals(updateEntitySpy.calls[1].args[2], contentWindow);

				historyManager.redo();

				assertEquals(mockEntityEditor.editingEntity.childCount, 0);
				assertEquals(contentWindow.treeView.children.length, 0);
				assertSpyCalls(updateEntitySpy, 3);
				assertStrictEquals(updateEntitySpy.calls[2].args[0], mockEntityEditor.editingEntity);
				assertEquals(updateEntitySpy.calls[2].args[1], EntityChangeType.Delete);
				assertEquals(updateEntitySpy.calls[2].args[2], contentWindow);
			},
		});
	},
});

Deno.test({
	name: "Rearranging treeview",
	async fn() {
		await basictest({
			async fn({args, mockEntityEditor, historyManager, mockAssetManager}) {
				const updateEntitySpy = spy(mockAssetManager.entityAssetManager, "updateEntity");
				const childEntity1 = new Entity("child1");
				mockEntityEditor.editingEntity.add(childEntity1);
				const childEntity2 = new Entity("child2");
				mockEntityEditor.editingEntity.add(childEntity2);
				const contentWindow = new ContentWindowOutliner(...args);

				const childTreeView1 = contentWindow.treeView.children[0];
				const childTreeView2 = contentWindow.treeView.children[1];
				assertExists(childTreeView1);
				assertExists(childTreeView2);

				await waitForMicrotasks();

				contentWindow.treeView.fireEvent("rearrange", /** @type {import("../../../../../../studio/src/ui/TreeView.js").TreeViewRearrangeEvent} */ ({
					movedItems: [
						{
							oldIndicesPath: [1],
							newIndicesPath: [0, 0],
						},
					],
				}));
				await waitForMicrotasks();

				assertEquals(mockEntityEditor.editingEntity.childCount, 1);
				assertEquals(childEntity1.childCount, 1);
				assertSpyCalls(updateEntitySpy, 2);
				assertStrictEquals(updateEntitySpy.calls[0].args[0], mockEntityEditor.editingEntity);
				assertEquals(updateEntitySpy.calls[0].args[1], EntityChangeType.Delete);
				assertEquals(updateEntitySpy.calls[0].args[2], contentWindow);
				assertStrictEquals(updateEntitySpy.calls[1].args[0], childEntity1);
				assertEquals(updateEntitySpy.calls[1].args[1], EntityChangeType.Create);
				assertEquals(updateEntitySpy.calls[1].args[2], contentWindow);

				historyManager.undo();

				assertEquals(mockEntityEditor.editingEntity.childCount, 2);
				assertEquals(childEntity1.childCount, 0);
				assertStrictEquals(updateEntitySpy.calls[2].args[0], childEntity1);
				assertEquals(updateEntitySpy.calls[2].args[1], EntityChangeType.Delete);
				assertStrictEquals(updateEntitySpy.calls[3].args[0], mockEntityEditor.editingEntity);
				assertEquals(updateEntitySpy.calls[3].args[1], EntityChangeType.Create);

				historyManager.redo();

				assertEquals(mockEntityEditor.editingEntity.childCount, 1);
				assertEquals(childEntity1.childCount, 1);
				assertStrictEquals(updateEntitySpy.calls[4].args[0], mockEntityEditor.editingEntity);
				assertEquals(updateEntitySpy.calls[4].args[1], EntityChangeType.Delete);
				assertEquals(updateEntitySpy.calls[4].args[2], contentWindow);
				assertStrictEquals(updateEntitySpy.calls[5].args[0], childEntity1);
				assertEquals(updateEntitySpy.calls[5].args[1], EntityChangeType.Create);
				assertEquals(updateEntitySpy.calls[5].args[2], contentWindow);
			},
		});
	},
});

Deno.test({
	name: "Dropping treeview with entity asset",
	async fn() {
		await basictest({
			async fn({args, mockEntityEditor, mockAssetManager, dragManager}) {
				const childEntity = mockEntityEditor.editingEntity.add(new Entity("child"));

				const entityAsset = new Entity("entity asset");

				const entityAssetUuid = "entity asset uuid";
				const {projectAsset} = createMockProjectAsset({
					uuid: entityAssetUuid,
					liveAsset: entityAsset,
				});

				stub(mockAssetManager, "getProjectAssetFromUuid", async uuid => {
					if (uuid == entityAssetUuid) {
						return projectAsset;
					}
					return null;
				});
				const makeUuidPersistentSpy = stub(mockAssetManager, "makeAssetUuidPersistent");
				stub(mockAssetManager.entityAssetManager, "createTrackedEntity", uuid => {
					if (uuid == entityAssetUuid) return entityAsset;
					throw new Error("unexpected uuid");
				});
				const updateEntitySpy = spy(mockAssetManager.entityAssetManager, "updateEntity");

				const contentWindow = new ContentWindowOutliner(...args);
				const childTreeView = contentWindow.treeView.children[0];

				const draggingUuid = dragManager.registerDraggingData(/** @type {import("../../../../../../studio/src/windowManagement/contentWindows/ContentWindowProject.js").DraggingProjectAssetData} */ ({
					assetType: ProjectAssetTypeEntity,
					assetUuid: entityAssetUuid,
					dataPopulated: true,
				}));
				const dragEvent = new DragEvent("drop");
				dragEvent.dataTransfer.setData(`text/renda; dragtype=projectasset; draggingdata=${draggingUuid}`, "");

				contentWindow.treeView.fireEvent("drop", /** @type {import("../../../../../../studio/src/ui/TreeView.js").TreeViewDropEvent} */ ({
					rawEvent: /** @type {any} */ (dragEvent),
					target: childTreeView,
				}));

				await waitForMicrotasks();

				assertEquals(childEntity.childCount, 1);
				assertSpyCalls(makeUuidPersistentSpy, 1);
				assertSpyCall(makeUuidPersistentSpy, 0, {
					args: [projectAsset],
				});
				assertSpyCalls(updateEntitySpy, 1);
				assertStrictEquals(updateEntitySpy.calls[0].args[0], childEntity);
				assertEquals(updateEntitySpy.calls[0].args[1], EntityChangeType.Create);
				assertEquals(updateEntitySpy.calls[0].args[2], contentWindow);

				// TODO: #697 add this to the history stack
			},
		});
	},
});
