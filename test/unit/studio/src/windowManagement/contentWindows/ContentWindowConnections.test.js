import "../../../shared/initializeStudio.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {ContentWindowConnections} from "../../../../../../studio/src/windowManagement/contentWindows/ContentWindowConnections.js";
import {assertTreeViewStructureEquals, getChildTreeViewFromIndices} from "../../../shared/treeViewUtil.js";
import {assertEquals, assertInstanceOf} from "std/testing/asserts.ts";
import {LabelGui} from "../../../../../../studio/src/ui/LabelGui.js";
import {PropertiesTreeViewEntry} from "../../../../../../studio/src/ui/propertiesTreeView/PropertiesTreeViewEntry.js";
import {Button} from "../../../../../../studio/src/ui/Button.js";
import {PreferencesManager} from "../../../../../../studio/src/preferences/PreferencesManager.js";

/**
 * @typedef ContentWindowConnectionsTestContext
 * @property {ContentWindowConnections} contentWindow
 * @property {import("../../../../../../studio/src/ui/TreeView.js").TreeView} studiosListTreeView
 * @property {() => void} fireOnAvailableConnectionsChanged
 */

/**
 * @param {object} options
 * @param {(ctx: ContentWindowConnectionsTestContext) => void | Promise<void>} options.fn
 * @param {import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").AvailableStudioDataList} [options.availableConnections]
 * @param {import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").ActiveStudioDataList} [options.activeConnections]
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
		const mockStudioInstance = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({
			projectManager: {
				studioConnectionsManager: {
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
				async getStudioConnectionsAllowRemoteIncoming() {
					return false;
				},
				async getStudioConnectionsAllowInternalIncoming() {
					return false;
				},
				currentProjectIsRemote,
			},
			preferencesManager: new PreferencesManager(),
		});
		const mockWindowManager = /** @type {import("../../../../../../studio/src/windowManagement/WindowManager.js").WindowManager} */ ({});

		const contentWindow = new ContentWindowConnections(mockStudioInstance, mockWindowManager, "uuid");

		assertTreeViewStructureEquals(contentWindow.studioClientConnectionTreeView, {
			children: [
				{
					name: "Studios",
				},
			],
		}, {
			checkAllChildren: false,
		});
		const studiosListTreeView = getChildTreeViewFromIndices(contentWindow.studioClientConnectionTreeView, 0);

		/** @type {ContentWindowConnectionsTestContext} */
		const testContext = {
			contentWindow,
			studiosListTreeView,
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
 * @param {import("../../../../../../studio/src/ui/TreeView.js").TreeView} treeView
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
	name: "Another internal studio without project meta data",
	async fn() {
		/** @type {import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").AvailableStudioDataList} */
		const availableConnections = new Map();
		availableConnections.set("uuid1", {
			id: "uuid1",
			clientType: "studio",
			messageHandlerType: "internal",
			projectMetaData: null,
		});
		await basicTest({
			availableConnections,
			fn({studiosListTreeView}) {
				const studioTreeView = getChildTreeViewFromIndices(studiosListTreeView, 0);
				assertConnectionTreeView(studioTreeView, "Studio", "Internal", "Unavailable", "The other studio instance either doesn't have a project open or has disabled incoming connections in its connections window.", false);
			},
		});
	},
});

Deno.test({
	name: "Another internal studio with project meta data, no write permission",
	async fn() {
		/** @type {import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").AvailableStudioDataList} */
		const availableConnections = new Map();
		availableConnections.set("uuid1", {
			id: "uuid1",
			clientType: "studio",
			messageHandlerType: "internal",
			projectMetaData: {
				fileSystemHasWritePermissions: false,
				name: "My Project",
				uuid: "uuid",
			},
		});
		await basicTest({
			availableConnections,
			fn({studiosListTreeView}) {
				const studioTreeView = getChildTreeViewFromIndices(studiosListTreeView, 0);
				assertConnectionTreeView(studioTreeView, "My Project", "Internal", "No Filesystem permissions", "The other studio instance either doesn't have a project open or has disabled incoming connections in its connections window.", false);
			},
		});
	},
});

Deno.test({
	name: "Another internal studion instance with project meta data, available",
	async fn() {
		/** @type {import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").AvailableStudioDataList} */
		const availableConnections = new Map();
		availableConnections.set("uuid1", {
			id: "uuid1",
			clientType: "studio",
			messageHandlerType: "internal",
			projectMetaData: {
				fileSystemHasWritePermissions: true,
				name: "",
				uuid: "uuid",
			},
		});
		await basicTest({
			availableConnections,
			fn({studiosListTreeView}) {
				const studioTreeView = getChildTreeViewFromIndices(studiosListTreeView, 0);
				assertConnectionTreeView(studioTreeView, "Untitled Project", "Internal", "Available", "", true);
			},
		});
	},
});

Deno.test({
	name: "Another webrtc studio instance with project meta data, available",
	async fn() {
		/** @type {import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").AvailableStudioDataList} */
		const availableConnections = new Map();
		availableConnections.set("uuid1", {
			id: "uuid1",
			clientType: "studio",
			messageHandlerType: "webRtc",
			projectMetaData: {
				fileSystemHasWritePermissions: true,
				name: "",
				uuid: "uuid",
			},
		});
		await basicTest({
			availableConnections,
			fn({studiosListTreeView}) {
				const studioTreeView = getChildTreeViewFromIndices(studiosListTreeView, 0);
				assertConnectionTreeView(studioTreeView, "Untitled Project", "WebRTC", "Available", "", true);
			},
		});
	},
});

Deno.test({
	name: "Old connections get removed",
	async fn() {
		/** @type {import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").AvailableStudioDataList} */
		const availableConnections = new Map();
		availableConnections.set("uuid1", {
			id: "uuid1",
			clientType: "studio",
			messageHandlerType: "webRtc",
			projectMetaData: null,
		});
		await basicTest({
			availableConnections,
			fn({studiosListTreeView, fireOnAvailableConnectionsChanged}) {
				availableConnections.clear();
				fireOnAvailableConnectionsChanged();
				assertEquals(studiosListTreeView.children.length, 0);
			},
		});
	},
});

Deno.test({
	name: "Callbacks are unregistered when destructed",
	async fn() {
		/** @type {import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").AvailableStudioDataList} */
		const availableConnections = new Map();
		await basicTest({
			availableConnections,
			fn({contentWindow, studiosListTreeView, fireOnAvailableConnectionsChanged}) {
				availableConnections.set("uuid1", {
					id: "uuid1",
					clientType: "studio",
					messageHandlerType: "webRtc",
					projectMetaData: null,
				});
				fireOnAvailableConnectionsChanged();
				assertEquals(studiosListTreeView.children.length, 1);

				contentWindow.destructor();

				availableConnections.clear();
				fireOnAvailableConnectionsChanged();
				assertEquals(studiosListTreeView.children.length, 1);
			},
		});
	},
});
