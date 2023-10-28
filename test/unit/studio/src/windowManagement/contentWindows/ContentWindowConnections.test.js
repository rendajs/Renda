import "../../../shared/initializeStudio.js";
import {installFakeDocument, uninstallFakeDocument} from "fake-dom/FakeDocument.js";
import {ContentWindowConnections} from "../../../../../../studio/src/windowManagement/contentWindows/ContentWindowConnections.js";
import {assertTreeViewStructureEquals, getChildTreeViewFromIndices} from "../../../shared/treeViewUtil.js";
import {assertEquals, assertInstanceOf} from "std/testing/asserts.ts";
import {LabelGui} from "../../../../../../studio/src/ui/LabelGui.js";
import {PropertiesTreeViewEntry} from "../../../../../../studio/src/ui/propertiesTreeView/PropertiesTreeViewEntry.js";
import {Button} from "../../../../../../studio/src/ui/Button.js";
import {PreferencesManager} from "../../../../../../studio/src/preferences/PreferencesManager.js";
import {getMockWindowManager} from "../shared.js";

/**
 * @typedef ContentWindowConnectionsTestContext
 * @property {ContentWindowConnections} contentWindow
 * @property {import("../../../../../../studio/src/ui/TreeView.js").TreeView} studiosListTreeView
 * @property {() => void} fireOnAvailableConnectionsChanged
 */

/**
 * @param {object} options
 * @param {(ctx: ContentWindowConnectionsTestContext) => void | Promise<void>} options.fn
 * @param {import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").StudioConnectionData[]} [options.connections]
 * @param {boolean} [options.currentProjectIsRemote]
 */
async function basicTest({
	fn,
	connections = [],
	currentProjectIsRemote = true,
}) {
	installFakeDocument();

	try {
		/** @type {Set<() => void>} */
		const onAvailableConnectionsChangedCbs = new Set();
		const mockStudioInstance = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({
			studioConnectionsManager: {
				getDefaultWebRtcDiscoveryEndPoint() {
					return "discovery.renda.studio";
				},
				onWebRtcDiscoveryServerStatusChange(cb) {},
				onConnectionsChanged(cb) {},
				*getConnections() {
					yield* connections;
				},
			},
			projectManager: {
				currentProjectIsRemote,
			},
			preferencesManager: new PreferencesManager(),
		});
		const contentWindow = new ContentWindowConnections(mockStudioInstance, getMockWindowManager(), "uuid");

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
	name: "An internal studio without project meta data",
	async fn() {
		await basicTest({
			connections: [
				{
					id: "uuid1",
					clientType: "studio-host",
					connectionState: "disconnected",
					connectionType: "renda:internal",
					projectMetaData: null,
				},
			],
			fn({studiosListTreeView}) {
				const studioTreeView = getChildTreeViewFromIndices(studiosListTreeView, 0);
				assertConnectionTreeView(studioTreeView, "Studio", "Internal", "Unavailable", "The other studio instance either doesn't have a project open or has disabled incoming connections in its connections window.", false);
			},
		});
	},
});

Deno.test({
	name: "An internal studio with project meta data, no write permission",
	async fn() {
		await basicTest({
			connections: [
				{
					id: "uuid1",
					clientType: "studio-host",
					connectionState: "disconnected",
					connectionType: "renda:internal",
					projectMetaData: {
						fileSystemHasWritePermissions: false,
						name: "My Project",
						uuid: "uuid",
					},
				},
			],
			fn({studiosListTreeView}) {
				const studioTreeView = getChildTreeViewFromIndices(studiosListTreeView, 0);
				assertConnectionTreeView(studioTreeView, "My Project", "Internal", "No Filesystem permissions", "The other studio instance hasn't approved file system permissions in its tab yet.", false);
			},
		});
	},
});

Deno.test({
	name: "An internal studio instance with project meta data, available",
	async fn() {
		await basicTest({
			connections: [
				{
					id: "uuid1",
					clientType: "studio-host",
					connectionState: "disconnected",
					connectionType: "renda:internal",
					projectMetaData: {
						fileSystemHasWritePermissions: true,
						name: "",
						uuid: "uuid",
					},
				},
			],
			fn({studiosListTreeView}) {
				const studioTreeView = getChildTreeViewFromIndices(studiosListTreeView, 0);
				assertConnectionTreeView(studioTreeView, "Untitled Project", "Internal", "Available", "", true);
			},
		});
	},
});

Deno.test({
	name: "A webrtc studio instance with project meta data, available",
	async fn() {
		await basicTest({
			connections: [
				{
					id: "uuid1",
					clientType: "studio-host",
					connectionState: "disconnected",
					connectionType: "renda:webrtc",
					projectMetaData: {
						fileSystemHasWritePermissions: true,
						name: "",
						uuid: "uuid",
					},

				},
			],
			fn({studiosListTreeView}) {
				const studioTreeView = getChildTreeViewFromIndices(studiosListTreeView, 0);
				assertConnectionTreeView(studioTreeView, "Untitled Project", "WebRTC", "Available", "", true);
			},
		});
	},
});

Deno.test({
	name: "Old connections get removed",
	ignore: true,
	async fn() {
		/** @type {import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").StudioConnectionData[]} */
		const connections = [
			{
				id: "uuid1",
				clientType: "studio-host",
				connectionState: "disconnected",
				connectionType: "renda:webrtc",
				projectMetaData: {
					fileSystemHasWritePermissions: true,
					name: "my project",
					uuid: "uuid",
				},
			},
		];
		await basicTest({
			connections,
			fn({studiosListTreeView, fireOnAvailableConnectionsChanged}) {
				const studioTreeView = getChildTreeViewFromIndices(studiosListTreeView, 0);
				assertConnectionTreeView(studioTreeView, "my project", "WebRTC", "Available", "", true);
				connections.pop();
				fireOnAvailableConnectionsChanged();
				assertEquals(studiosListTreeView.children.length, 0);
			},
		});
	},
});

Deno.test({
	name: "Callbacks are unregistered when destructed",
	ignore: true,
	async fn() {
		/** @type {import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").StudioConnectionData[]} */
		const connections = [];
		await basicTest({
			connections,
			fn({contentWindow, studiosListTreeView, fireOnAvailableConnectionsChanged}) {
				connections.push({
					id: "uuid1",
					clientType: "studio-host",
					connectionState: "disconnected",
					connectionType: "renda:webrtc",
					projectMetaData: null,
				});
				fireOnAvailableConnectionsChanged();
				assertEquals(studiosListTreeView.children.length, 1);

				contentWindow.destructor();

				connections.pop();
				fireOnAvailableConnectionsChanged();
				assertEquals(studiosListTreeView.children.length, 1);
			},
		});
	},
});
