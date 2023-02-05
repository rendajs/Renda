import "../../../shared/initializeEditor.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {ContentWindowConnections} from "../../../../../../editor/src/windowManagement/contentWindows/ContentWindowConnections.js";
import {assertTreeViewStructureEquals, getChildTreeViewFromIndices} from "../../../shared/treeViewUtil.js";
import {assertEquals, assertInstanceOf} from "std/testing/asserts.ts";
import {LabelGui} from "../../../../../../editor/src/ui/LabelGui.js";
import {PropertiesTreeViewEntry} from "../../../../../../editor/src/ui/propertiesTreeView/PropertiesTreeViewEntry.js";
import {Button} from "../../../../../../editor/src/ui/Button.js";

/**
 * @typedef ContentWindowConnectionsTestContext
 * @property {ContentWindowConnections} contentWindow
 * @property {import("../../../../../../editor/src/ui/TreeView.js").TreeView} editorsListTreeView
 * @property {() => void} fireOnAvailableConnectionsChanged
 */

/**
 * @param {Object} options
 * @param {(ctx: ContentWindowConnectionsTestContext) => void | Promise<void>} options.fn
 * @param {import("../../../../../../editor/src/network/editorConnections/EditorConnectionsManager.js").AvailableEditorDataList} [options.availableConnections]
 * @param {import("../../../../../../editor/src/network/editorConnections/EditorConnectionsManager.js").ActiveEditorDataList} [options.activeConnections]
 * @param {boolean} [options.currentProjectIsRemote]
 */
async function basicTest({
	fn,
	availableConnections = new Map(),
	activeConnections = new Map(),
	currentProjectIsRemote = true,
}) {
	installFakeDocument();

	try {
		/** @type {Set<() => void>} */
		const onAvailableConnectionsChangedCbs = new Set();
		const mockEditorInstance = /** @type {import("../../../../../../editor/src/Editor.js").Editor} */ ({
			projectManager: {
				editorConnectionsManager: {
					getDefaultEndPoint() {},
					onDiscoveryServerStatusChange(cb) {},
					removeOnDiscoveryServerStatusChange(cb) {},
					onAvailableConnectionsChanged(cb) {
						onAvailableConnectionsChangedCbs.add(cb);
					},
					removeOnAvailableConnectionsChanged(cb) {
						onAvailableConnectionsChangedCbs.delete(cb);
					},
					onActiveConnectionsChanged(cb) {},
					removeOnActiveConnectionsChanged(cb) {},
					availableConnections,
					activeConnections,
				},
				async getEditorConnectionsAllowRemoteIncoming() {
					return false;
				},
				async getEditorConnectionsAllowInternalIncoming() {
					return false;
				},
				currentProjectIsRemote,
			},
		});
		const mockWindowManager = /** @type {import("../../../../../../editor/src/windowManagement/WindowManager.js").WindowManager} */ ({});

		const contentWindow = new ContentWindowConnections(mockEditorInstance, mockWindowManager, "uuid");

		assertTreeViewStructureEquals(contentWindow.editorClientConnectionTreeView, {
			children: [
				{
					name: "Editors",
				},
			],
		}, {
			checkAllChildren: false,
		});
		const editorsListTreeView = getChildTreeViewFromIndices(contentWindow.editorClientConnectionTreeView, 0);

		/** @type {ContentWindowConnectionsTestContext} */
		const testContext = {
			contentWindow,
			editorsListTreeView,
			fireOnAvailableConnectionsChanged() {
				onAvailableConnectionsChangedCbs.forEach(cb => cb());
			},
		};

		await fn(testContext);
	} finally {
		uninstallFakeDocument();
	}
}

/**
 * @param {import("../../../../../../editor/src/ui/TreeView.js").TreeView} treeView
 * @param {string} projectName
 * @param {string} connectionType
 * @param {string} status
 * @param {string} statusTooltip
 * @param {boolean} connectButtonEnabled
 */
function assertConnectionTreeView(treeView, projectName, connectionType, status, statusTooltip, connectButtonEnabled) {
	assertTreeViewStructureEquals(treeView, {
		name: projectName,
		children: [
			{
				propertiesLabel: "Connection Type",
			},
			{
				propertiesLabel: "Status",
			},
			{
				propertiesLabel: "Connect",
			},
		],
	});
	const typeTreeView = getChildTreeViewFromIndices(treeView, 0);
	assertInstanceOf(typeTreeView, PropertiesTreeViewEntry);
	assertInstanceOf(typeTreeView.gui, LabelGui);
	assertEquals(typeTreeView.gui.value, connectionType);

	const statusTreeView = getChildTreeViewFromIndices(treeView, 1);
	assertInstanceOf(statusTreeView, PropertiesTreeViewEntry);
	assertInstanceOf(statusTreeView.gui, LabelGui);
	assertEquals(statusTreeView.gui.value, status);
	assertEquals(statusTreeView.gui.tooltip, statusTooltip);

	const connectButtonTreeView = getChildTreeViewFromIndices(treeView, 2);
	assertInstanceOf(connectButtonTreeView, PropertiesTreeViewEntry);
	assertInstanceOf(connectButtonTreeView.gui, Button);
	assertEquals(connectButtonTreeView.gui.disabled, !connectButtonEnabled);
}

Deno.test({
	name: "Another internal editor without project meta data",
	async fn() {
		/** @type {import("../../../../../../editor/src/network/editorConnections/EditorConnectionsManager.js").AvailableEditorDataList} */
		const availableConnections = new Map();
		availableConnections.set("uuid1", {
			id: "uuid1",
			clientType: "editor",
			messageHandlerType: "internal",
			projectMetaData: null,
		});
		await basicTest({
			availableConnections,
			fn({editorsListTreeView}) {
				const editorTreeView = getChildTreeViewFromIndices(editorsListTreeView, 0);
				assertConnectionTreeView(editorTreeView, "Editor", "Internal", "Unavailable", "This editor either doesn't have a project open or has disabled incoming connections in its connections window.", false);
			},
		});
	},
});

Deno.test({
	name: "Another internal editor with project meta data, no write permission",
	async fn() {
		/** @type {import("../../../../../../editor/src/network/editorConnections/EditorConnectionsManager.js").AvailableEditorDataList} */
		const availableConnections = new Map();
		availableConnections.set("uuid1", {
			id: "uuid1",
			clientType: "editor",
			messageHandlerType: "internal",
			projectMetaData: {
				fileSystemHasWritePermissions: false,
				name: "My Project",
				uuid: "uuid",
			},
		});
		await basicTest({
			availableConnections,
			fn({editorsListTreeView}) {
				const editorTreeView = getChildTreeViewFromIndices(editorsListTreeView, 0);
				assertConnectionTreeView(editorTreeView, "My Project", "Internal", "No Filesystem permissions", "This editor either doesn't have a project open or has disabled incoming connections in its connections window.", false);
			},
		});
	},
});

Deno.test({
	name: "Another internal editor with project meta data, available",
	async fn() {
		/** @type {import("../../../../../../editor/src/network/editorConnections/EditorConnectionsManager.js").AvailableEditorDataList} */
		const availableConnections = new Map();
		availableConnections.set("uuid1", {
			id: "uuid1",
			clientType: "editor",
			messageHandlerType: "internal",
			projectMetaData: {
				fileSystemHasWritePermissions: true,
				name: "",
				uuid: "uuid",
			},
		});
		await basicTest({
			availableConnections,
			fn({editorsListTreeView}) {
				const editorTreeView = getChildTreeViewFromIndices(editorsListTreeView, 0);
				assertConnectionTreeView(editorTreeView, "Untitled Project", "Internal", "Available", "", true);
			},
		});
	},
});

Deno.test({
	name: "Another webrtc editor with project meta data, available",
	async fn() {
		/** @type {import("../../../../../../editor/src/network/editorConnections/EditorConnectionsManager.js").AvailableEditorDataList} */
		const availableConnections = new Map();
		availableConnections.set("uuid1", {
			id: "uuid1",
			clientType: "editor",
			messageHandlerType: "webRtc",
			projectMetaData: {
				fileSystemHasWritePermissions: true,
				name: "",
				uuid: "uuid",
			},
		});
		await basicTest({
			availableConnections,
			fn({editorsListTreeView}) {
				const editorTreeView = getChildTreeViewFromIndices(editorsListTreeView, 0);
				assertConnectionTreeView(editorTreeView, "Untitled Project", "WebRTC", "Available", "", true);
			},
		});
	},
});

Deno.test({
	name: "Old connections get removed",
	async fn() {
		/** @type {import("../../../../../../editor/src/network/editorConnections/EditorConnectionsManager.js").AvailableEditorDataList} */
		const availableConnections = new Map();
		availableConnections.set("uuid1", {
			id: "uuid1",
			clientType: "editor",
			messageHandlerType: "webRtc",
			projectMetaData: null,
		});
		await basicTest({
			availableConnections,
			fn({editorsListTreeView, fireOnAvailableConnectionsChanged}) {
				availableConnections.clear();
				fireOnAvailableConnectionsChanged();
				assertEquals(editorsListTreeView.children.length, 0);
			},
		});
	},
});

Deno.test({
	name: "Callbacks are unregistered when destructed",
	async fn() {
		/** @type {import("../../../../../../editor/src/network/editorConnections/EditorConnectionsManager.js").AvailableEditorDataList} */
		const availableConnections = new Map();
		await basicTest({
			availableConnections,
			fn({contentWindow, editorsListTreeView, fireOnAvailableConnectionsChanged}) {
				availableConnections.set("uuid1", {
					id: "uuid1",
					clientType: "editor",
					messageHandlerType: "webRtc",
					projectMetaData: null,
				});
				fireOnAvailableConnectionsChanged();
				assertEquals(editorsListTreeView.children.length, 1);

				contentWindow.destructor();

				availableConnections.clear();
				fireOnAvailableConnectionsChanged();
				assertEquals(editorsListTreeView.children.length, 1);
			},
		});
	},
});
