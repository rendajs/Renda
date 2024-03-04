import "../../../shared/initializeStudio.js";
import { installFakeDocument, uninstallFakeDocument } from "fake-dom/FakeDocument.js";
import { injectMockStudioInstance } from "../../../../../../studio/src/studioInstance.js";
import { MemoryStudioFileSystem } from "../../../../../../studio/src/util/fileSystems/MemoryStudioFileSystem.js";
import { ContentWindowProject } from "../../../../../../studio/src/windowManagement/contentWindows/ContentWindowProject.js";
import { assertTreeViewStructureEquals, getValidateDragResult } from "../../../shared/treeViewUtil.js";
import { assertEquals } from "std/testing/asserts.ts";
import { assertSpyCall, assertSpyCalls, resolvesNext, stub } from "std/testing/mock.ts";
import { PreferencesManager } from "../../../../../../studio/src/preferences/PreferencesManager.js";
import { DragManager } from "../../../../../../studio/src/misc/DragManager.js";
import { Entity } from "../../../../../../src/mod.js";
import { DragEvent } from "fake-dom/FakeDragEvent.js";
import { createMockProjectAsset } from "../../../shared/createMockProjectAsset.js";
import { waitForMicrotasks } from "../../../../shared/waitForMicroTasks.js";

const BASIC_WINDOW_UUID = "basic window uuid";

/**
 * @param {object} options
 * @param {Object<string, import("../../../../../../studio/src/util/fileSystems/StudioFileSystem.js").AllowedWriteFileTypes>} [options.fileSystemStructure]
 * @param {boolean} [options.assetSettingsLoaded] Whether the mock asset manager should already have loaded asset settings.
 * @param {"none" | "expand"} [options.treeViewAction] If true, the root tree view will be expanded in order to trigger the asset settings load.
 */
async function basicSetup({
	fileSystemStructure = {},
	assetSettingsLoaded = false,
	treeViewAction = "expand",
} = {}) {
	installFakeDocument();

	const mockWindowManager = /** @type {import("../../../../../../studio/src/windowManagement/WindowManager.js").WindowManager} */ ({});

	const mockSelectionGroup = /** @type {import("../../../../../../studio/src/misc/SelectionGroup.js").SelectionGroup<any>} */ ({});
	const mockSelectionManager = /** @type {import("../../../../../../studio/src/misc/SelectionManager.js").SelectionManager} */ ({
		createSelectionGroup() {
			return mockSelectionGroup;
		},
	});

	const mockFileSystem = new MemoryStudioFileSystem();
	mockFileSystem.setFullStructure(fileSystemStructure);

	/** @type {Set<import("../../../../../../studio/src/assets/AssetManager.js").OnPermissionPromptResultCallback>} */
	const permissionPromptCbs = new Set();

	const mockAssetManager = /** @type {import("../../../../../../studio/src/assets/AssetManager.js").AssetManager} */ ({
		onPermissionPromptResult(cb) {
			permissionPromptCbs.add(cb);
		},
		removeOnPermissionPromptResult(cb) {
			permissionPromptCbs.delete(cb);
		},
		async loadAssetSettings(fromUserGesture) {},
		assetSettingsLoaded,
	});

	const mockProjectManager = /** @type {import("../../../../../../studio/src/projectSelector/ProjectManager.js").ProjectManager} */ ({
		currentProjectFileSystem: /** @type {import("../../../../../../studio/src/util/fileSystems/StudioFileSystem.js").StudioFileSystem} */ (mockFileSystem),
		onFileChange(cb) {},
		assetManager: mockAssetManager,
		assertAssetManagerExists() {
			return mockAssetManager;
		},
		async getAssetManager() {
			return mockAssetManager;
		},
	});

	const mockStudioInstance = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({
		selectionManager: mockSelectionManager,
		projectManager: mockProjectManager,
		preferencesManager: new PreferencesManager(),
	});

	const dragManager = new DragManager();
	mockStudioInstance.dragManager = dragManager;

	injectMockStudioInstance(mockStudioInstance);

	const contentWindow = new ContentWindowProject(mockStudioInstance, mockWindowManager, BASIC_WINDOW_UUID);

	await contentWindow.waitForInit();

	if (treeViewAction == "expand") {
		contentWindow.treeView.expanded = true;

		await contentWindow.waitForTreeViewUpdate();
	}

	return {
		contentWindow,
		mockSelectionGroup,
		dragManager,
		mockAssetManager,
		mockFileSystem,
		/**
		 * @param {boolean} granted
		 */
		triggerPermissionPromptCbs(granted) {
			permissionPromptCbs.forEach(cb => cb(granted));
		},
		uninstall() {
			uninstallFakeDocument();
			injectMockStudioInstance(null);
		},
	};
}

Deno.test({
	name: "Fills the tree view with the files in the project excluding any subdirectories",
	async fn() {
		const { contentWindow, uninstall } = await basicSetup({
			fileSystemStructure: {
				"fileA.txt": "a",
				"fileB.txt": "b",
				"folder/fileC.txt": "c",
				"folder/fileD.txt": "d",
				"folder/subfolder/fileE.txt": "e",
				"folder/subfolder/fileF.txt": "f",
			},
		});

		try {
			assertTreeViewStructureEquals(contentWindow.treeView, {
				name: "",
				children: [
					{
						name: "folder",
						children: [],
					},
					{
						name: "fileA.txt",
						children: [],
					},
					{
						name: "fileB.txt",
						children: [],
					},
				],
			});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Files are shown in alphabetical order with folders at the top",
	async fn() {
		const { contentWindow, uninstall } = await basicSetup({
			fileSystemStructure: {
				// The order of these has been picked specifically to cause the
				// test to fail when the items are not inserted in the same
				// order as the sorted array.
				// i.e. in `updateTreeViewRecursive` when iterating over
				// `fileTree.directories` rather than `sortedDirectories` the
				// test should fail, as this would cause an incorrect order.
				"bb.txt": "",
				"aa.txt": "",
				"aaFolder/file.txt": "",
				"bB.txt": "",
				"AA.txt": "",
				"zzFolder/file.txt": "",
			},
		});

		try {
			assertTreeViewStructureEquals(contentWindow.treeView, {
				children: [
					{
						name: "aaFolder",
					},
					{
						name: "zzFolder",
					},
					{
						name: "aa.txt",
					},
					{
						name: "AA.txt",
					},
					{
						name: "bb.txt",
					},
					{
						name: "bB.txt",
					},
				],
			});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Root tree view is expanded when the assetmanager is already loaded",
	async fn() {
		const { contentWindow, uninstall } = await basicSetup({
			assetSettingsLoaded: true,
			treeViewAction: "none",
		});

		try {
			assertEquals(contentWindow.treeView.expanded, true);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Root tree view is collapsed when permission is denied",
	async fn() {
		const { contentWindow, triggerPermissionPromptCbs, uninstall } = await basicSetup();

		try {
			assertEquals(contentWindow.treeView.expanded, true);
			triggerPermissionPromptCbs(false);
			assertEquals(contentWindow.treeView.expanded, false);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Activates the selection group when the content window is activated",
	async fn() {
		const { contentWindow, mockSelectionGroup, uninstall } = await basicSetup();

		try {
			const activateSpy = stub(mockSelectionGroup, "activate", () => {});
			contentWindow.activate();
			assertSpyCalls(activateSpy, 1);
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Hovering a dragged item does nothing on files",
	async fn() {
		const { contentWindow, uninstall } = await basicSetup({
			fileSystemStructure: {
				"folder/file.txt": "a",
				"file.txt": "a",
			},
		});
		try {
			const fileTreeView = contentWindow.treeView.children[1];
			const result = getValidateDragResult(fileTreeView);
			assertEquals(result.acceptedState, "rejected");
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Hovering an external file on folders accepts the event",
	async fn() {
		const { contentWindow, uninstall } = await basicSetup({
			fileSystemStructure: {
				"folder/file.txt": "a",
			},
		});
		try {
			const folderTreeView = contentWindow.treeView.children[0];
			const result = getValidateDragResult(folderTreeView, {
				kind: "file",
			});
			assertEquals(result.acceptedState, "accepted");
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Hovering an outliner treeview on folders accepts the event",
	async fn() {
		const { contentWindow, dragManager, mockAssetManager, uninstall } = await basicSetup({
			fileSystemStructure: {
				"folder/file.txt": "a",
			},
		});

		try {
			mockAssetManager.entityAssetManager = /** @type {import("../../../../../../studio/src/assets/EntityAssetManager.js").EntityAssetManager} */ ({
				getLinkedAssetUuid(entity) {},
			});

			const folderTreeView = contentWindow.treeView.children[0];
			const draggingEntity = new Entity();
			const draggingUuid = dragManager.registerDraggingData(draggingEntity);
			const result = getValidateDragResult(folderTreeView, {
				kind: "string",
				mimeType: {
					type: "text",
					subType: "renda",
					parameters: {
						dragtype: "outlinertreeview",
						draggingdata: draggingUuid,
					},
				},
			});
			assertEquals(result.acceptedState, "accepted");
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Hovering an outliner treeview rejects when the entity is already an entity asset",
	async fn() {
		const { contentWindow, dragManager, mockAssetManager, uninstall } = await basicSetup({
			fileSystemStructure: {
				"folder/file.txt": "a",
			},
		});

		try {
			mockAssetManager.entityAssetManager = /** @type {import("../../../../../../studio/src/assets/EntityAssetManager.js").EntityAssetManager} */ ({
				getLinkedAssetUuid(entity) {
					return "uuid";
				},
			});

			const folderTreeView = contentWindow.treeView.children[0];
			const draggingEntity = new Entity();

			const draggingUuid = dragManager.registerDraggingData(draggingEntity);
			const result = getValidateDragResult(folderTreeView, {
				kind: "string",
				mimeType: {
					type: "text",
					subType: "renda",
					parameters: {
						dragtype: "outlinertreeview",
						draggingdata: draggingUuid,
					},
				},
			});
			assertEquals(result.acceptedState, "default");
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Dropping an outliner treeview turns it into an entity asset",
	async fn() {
		const { contentWindow, dragManager, mockAssetManager, uninstall } = await basicSetup({
			fileSystemStructure: {
				"folder/file.txt": "a",
			},
		});

		try {
			mockAssetManager.entityAssetManager = /** @type {import("../../../../../../studio/src/assets/EntityAssetManager.js").EntityAssetManager} */ ({
				getLinkedAssetUuid(entity) {},
				replaceTrackedEntity(uuid, entity) {},
			});
			const { projectAsset: createdProjectAsset } = createMockProjectAsset();
			const createNewAssetSpy = stub(mockAssetManager, "createNewAsset", resolvesNext([createdProjectAsset]));
			const makeUuidPersistentSpy = stub(mockAssetManager, "makeAssetUuidPersistent", async () => {});

			const folderTreeView = contentWindow.treeView.children[0];
			const draggingEntity = new Entity();
			const draggingUuid = dragManager.registerDraggingData(draggingEntity);
			const event = new DragEvent("drop");
			event.dataTransfer.setData(`text/renda; dragtype=outlinertreeview; draggingdata=${draggingUuid}`, "");
			folderTreeView.fireEvent("drop", /** @type {import("../../../../../../studio/src/ui/TreeView.js").TreeViewDropEvent} */ ({
				rawEvent: /** @type {any} */ (event),
				target: folderTreeView,
			}));

			await waitForMicrotasks();

			assertSpyCalls(createNewAssetSpy, 1);
			assertSpyCall(createNewAssetSpy, 0, {
				args: [["folder"], "renda:entity"],
			});
			assertSpyCalls(makeUuidPersistentSpy, 1);
			assertSpyCall(makeUuidPersistentSpy, 0, {
				args: [createdProjectAsset],
			});
		} finally {
			uninstall();
		}
	},
});

Deno.test({
	name: "Dropping an external file writes it to disk",
	async fn() {
		const { contentWindow, mockFileSystem, uninstall } = await basicSetup({
			fileSystemStructure: {
				"folder/file.txt": "a",
			},
		});

		try {
			const folderTreeView = contentWindow.treeView.children[0];
			const event = new DragEvent("drop");
			const file = new File(["hello"], "droppedFile.txt");
			event.dataTransfer.files.push(file);
			folderTreeView.fireEvent("drop", /** @type {import("../../../../../../studio/src/ui/TreeView.js").TreeViewDropEvent} */ ({
				rawEvent: /** @type {any} */ (event),
				target: folderTreeView,
			}));

			await waitForMicrotasks();

			const result = await mockFileSystem.readText(["folder", "droppedFile.txt"]);
			assertEquals(result, "hello");
		} finally {
			uninstall();
		}
	},
});
