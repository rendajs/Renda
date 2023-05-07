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
import {EntityAssetManager} from "../../../../../../studio/src/assets/EntityAssetManager.js";
import {HistoryManager} from "../../../../../../studio/src/misc/HistoryManager.js";
import {createMockKeyboardShortcutManager} from "../../../shared/mockKeyboardShortcutManager.js";

/**
 * @typedef ContentWindowOutlinerTestContext
 * @property {ConstructorParameters<typeof ContentWindowOutliner>} args
 * @property {import("../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js").ContentWindowEntityEditor[]} mockEntityEditors
 * @property {import("../../../../../../studio/src/windowManagement/contentWindows/ContentWindowEntityEditor/ContentWindowEntityEditor.js").ContentWindowEntityEditor} mockEntityEditor
 * @property {import("../../../../../../studio/src/assets/AssetManager.js").AssetManager} mockAssetManager
 * @property {HistoryManager} historyManager
 */

/**
 * @param {object} options
 * @param {number} [options.availableEntityEditors]
 * @param {(context: ContentWindowOutlinerTestContext) => void} options.fn
 */
function basictest({
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
		assetManager.entityAssetManager = new EntityAssetManager(assetManager);

		const {keyboardShortcutManager} = createMockKeyboardShortcutManager();
		const historyManager = new HistoryManager(keyboardShortcutManager);
		mockStudioInstance.historyManager = historyManager;

		fn({
			args,
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
	fn() {
		basictest({
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
	fn() {
		basictest({
			fn({args, mockEntityEditors}) {
				const contentWindow = new ContentWindowOutliner(...args);
				assertStrictEquals(contentWindow.linkedEntityEditor, mockEntityEditors[0]);
			},
		});
	},
});

Deno.test({
	name: "Initial treeview represents the hierarchy of the entity",
	fn() {
		basictest({
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
	fn() {
		basictest({
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
	fn() {
		basictest({
			fn({args, mockEntityEditor}) {
				const notifyEntityChangedSpy = spy(mockEntityEditor, "notifyEntityChanged");
				const contentWindow = new ContentWindowOutliner(...args);
				clickAddEntityButton(contentWindow);
				assertTreeViewStructureEquals(contentWindow.treeView, {
					name: "Entity",
					children: [{name: "Entity"}],
				});
				assertSpyCalls(notifyEntityChangedSpy, 1);
				assertStrictEquals(notifyEntityChangedSpy.calls[0].args[0], mockEntityEditor.editingEntity.children[0]);
				assertEquals(notifyEntityChangedSpy.calls[0].args[1], "create");
			},
		});
	},
});

Deno.test({
	name: "'+' button creates a new entity on the selected entities",
	fn() {
		basictest({
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
	fn() {
		basictest({
			fn({args, mockEntityEditor, historyManager}) {
				const notifyEntityChangedSpy = spy(mockEntityEditor, "notifyEntityChanged");
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

				historyManager.undo();

				assertSpyCalls(notifyEntityChangedSpy, 2);
				assertEquals(childEntity.name, "old name");
				assertStrictEquals(notifyEntityChangedSpy.calls[1].args[0], childEntity);
				assertEquals(notifyEntityChangedSpy.calls[1].args[1], "rename");

				historyManager.redo();

				assertSpyCalls(notifyEntityChangedSpy, 3);
				assertEquals(childEntity.name, "new name");
				assertStrictEquals(notifyEntityChangedSpy.calls[2].args[0], childEntity);
				assertEquals(notifyEntityChangedSpy.calls[2].args[1], "rename");
			},
		});
	},
});
