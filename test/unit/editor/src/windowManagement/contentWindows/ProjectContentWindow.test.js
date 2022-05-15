import "../../../shared/initializeEditor.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {injectMockEditorInstance} from "../../../../../../editor/src/editorInstance.js";
import {MemoryEditorFileSystem} from "../../../../../../editor/src/util/fileSystems/MemoryEditorFileSystem.js";
import {ProjectContentWindow} from "../../../../../../editor/src/windowManagement/contentWindows/ProjectContentWindow.js";
import {assertTreeViewStructureEquals} from "../../../shared/treeViewUtil.js";

const BASIC_WINDOW_UUID = "basic window uuid";

/**
 * @param {Object} [options]
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

	const contentWindow = new ProjectContentWindow(mockEditorInstance, mockWindowManager, BASIC_WINDOW_UUID);
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
