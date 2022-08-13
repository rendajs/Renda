import "../../../shared/initializeEditor.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {injectMockEditorInstance} from "../../../../../../editor/src/editorInstance.js";
import {MemoryEditorFileSystem} from "../../../../../../editor/src/util/fileSystems/MemoryEditorFileSystem.js";
import {ContentWindowProject} from "../../../../../../editor/src/windowManagement/contentWindows/ContentWindowProject.js";
import {assertTreeViewStructureEquals} from "../../../shared/treeViewUtil.js";

const BASIC_WINDOW_UUID = "basic window uuid";

/**
 * @param {Object} options
 * @param {Object.<string, import("../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").AllowedWriteFileTypes>} [options.fileSystemStructure]
 */
function basicSetup({
	fileSystemStructure = {},
} = {}) {
	installFakeDocument();

	const mockWindowManager = /** @type {import("../../../../../../editor/src/windowManagement/WindowManager.js").WindowManager} */ ({});

	const mockSelectionGroup = /** @type {import("../../../../../../editor/src/misc/SelectionGroup.js").SelectionGroup<any>} */ ({});
	const mockSelectionManager = /** @type {import("../../../../../../editor/src/misc/SelectionManager.js").SelectionManager} */ ({
		createSelectionGroup() {
			return mockSelectionGroup;
		},
	});

	const mockFileSystem = new MemoryEditorFileSystem();
	mockFileSystem.setFullStructure(fileSystemStructure);

	const mockProjectManager = /** @type {import("../../../../../../editor/src/projectSelector/ProjectManager.js").ProjectManager} */ ({
		currentProjectFileSystem: /** @type {import("../../../../../../editor/src/util/fileSystems/EditorFileSystem.js").EditorFileSystem} */ (mockFileSystem),
		onExternalChange(cb) {},
	});

	const mockEditorInstance = /** @type {import("../../../../../../editor/src/Editor.js").Editor} */ ({
		selectionManager: mockSelectionManager,
		projectManager: mockProjectManager,
	});

	injectMockEditorInstance(mockEditorInstance);

	const contentWindow = new ContentWindowProject(mockEditorInstance, mockWindowManager, BASIC_WINDOW_UUID);
	return {
		contentWindow,
		uninstall() {
			uninstallFakeDocument();
			injectMockEditorInstance(null);
		},
	};
}

Deno.test({
	name: "Fills the tree view with the files in the project excluding any subdirectories",
	async fn() {
		const {contentWindow, uninstall} = basicSetup({
			fileSystemStructure: {
				"fileA.txt": "a",
				"fileB.txt": "b",
				"folder/fileC.txt": "c",
				"folder/fileD.txt": "d",
				"folder/subfolder/fileE.txt": "e",
				"folder/subfolder/fileF.txt": "f",
			},
		});

		await contentWindow.waitForInit();

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

		uninstall();
	},
});

Deno.test({
	name: "Files are shown in alphabetical order with folders at the top",
	async fn() {
		const {contentWindow, uninstall} = basicSetup({
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

		await contentWindow.waitForInit();

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

		uninstall();
	},
});
