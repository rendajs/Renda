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
import {TextGui} from "../../../../../../studio/src/ui/TextGui.js";
import {assertSpyCall, assertSpyCalls, spy} from "std/testing/mock.ts";

/**
 * @typedef ContentWindowConnectionsTestContext
 * @property {ContentWindowConnections} contentWindow
 * @property {import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").StudioConnectionsManager} studioConnectionsManager
 * @property {LabelGui} webRtcStatusLabel
 * @property {import("../../../../../../studio/src/ui/TreeView.js").TreeView} studiosListTreeView
 * @property {() => void} fireOnAvailableConnectionsChanged
 * @property {(status: import("../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").DiscoveryServerStatusType) => void} fireOnWebRtcDiscoveryserverStatusChange
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
		/** @type {import("../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").DiscoveryServerStatusType} */
		let webRtcDiscoveryServerStatus = "disconnected";
		/** @type {Set<() => void>} */
		const onAvailableConnectionsChangedCbs = new Set();
		/** @type {Set<import("../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").OnDiscoveryManagerWebRtcStatusChangeCallback>} */
		const onWebRtcDiscoveryServerStatusChangeCbs = new Set();
		const mockStudioInstance = /** @type {import("../../../../../../studio/src/Studio.js").Studio} */ ({
			studioConnectionsManager: {
				getDefaultWebRtcDiscoveryEndpoint() {
					return "discovery.renda.studio";
				},
				onWebRtcDiscoveryServerStatusChange(cb) {
					onWebRtcDiscoveryServerStatusChangeCbs.add(cb);
				},
				removeOnWebRtcDiscoveryServerStatusChange(cb) {
					onWebRtcDiscoveryServerStatusChangeCbs.delete(cb);
				},
				onConnectionsChanged(cb) {
					onAvailableConnectionsChangedCbs.add(cb);
				},
				removeOnConnectionsChanged(cb) {
					onAvailableConnectionsChangedCbs.delete(cb);
				},
				*getConnections() {
					yield* connections;
				},
				get webRtcDiscoveryServerStatus() {
					return webRtcDiscoveryServerStatus;
				},
				setWebRtcDiscoveryEndpoint(endpoint) {},
				requestConnection(otherClientUuid) {},
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
		const webRtcStatusLabel = contentWindow.discoveryServerStatusLabel.gui;

		/** @type {ContentWindowConnectionsTestContext} */
		const testContext = {
			contentWindow,
			studiosListTreeView,
			webRtcStatusLabel,
			studioConnectionsManager: mockStudioInstance.studioConnectionsManager,
			fireOnAvailableConnectionsChanged() {
				onAvailableConnectionsChangedCbs.forEach(cb => cb());
			},
			fireOnWebRtcDiscoveryserverStatusChange(status) {
				webRtcDiscoveryServerStatus = status;
				onWebRtcDiscoveryServerStatusChangeCbs.forEach(cb => cb(status));
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
	const connectButtonGui = connectButtonTreeView.gui;
	assertEquals(connectButtonTreeView.gui.disabled, !connectButtonEnabled);

	return {connectButtonGui};
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
					projectMetadata: null,
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
					projectMetadata: {
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
					projectMetadata: {
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
					projectMetadata: {
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
	name: "Unknown connection type",
	async fn() {
		await basicTest({
			connections: [
				{
					id: "uuid1",
					clientType: "studio-host",
					connectionState: "disconnected",
					connectionType: "renda:unknown",
					projectMetadata: {
						fileSystemHasWritePermissions: true,
						name: "project name",
						uuid: "uuid",
					},
				},
			],
			fn({studiosListTreeView}) {
				const studioTreeView = getChildTreeViewFromIndices(studiosListTreeView, 0);
				assertConnectionTreeView(studioTreeView, "project name", "renda:unknown", "Available", "", true);
			},
		});
	},
});

Deno.test({
	name: "Studio-client with no open project",
	async fn() {
		await basicTest({
			connections: [
				{
					id: "uuid1",
					clientType: "studio-client",
					connectionState: "disconnected",
					connectionType: "renda:webrtc",
					projectMetadata: null,
				},
			],
			fn({studiosListTreeView}) {
				const studioTreeView = getChildTreeViewFromIndices(studiosListTreeView, 0);
				assertConnectionTreeView(studioTreeView, "Studio Client", "WebRTC", "Unavailable", "This connection is a studio instance without an open project. Connections can only be initiated from the other end.", false);
			},
		});
	},
});

Deno.test({
	name: "Studio-client with an open project",
	async fn() {
		await basicTest({
			connections: [
				{
					id: "uuid1",
					clientType: "studio-client",
					connectionState: "disconnected",
					connectionType: "renda:webrtc",
					projectMetadata: {
						fileSystemHasWritePermissions: true,
						name: "my project",
						uuid: "uuid",
					},
				},
			],
			fn({studiosListTreeView}) {
				const studioTreeView = getChildTreeViewFromIndices(studiosListTreeView, 0);
				assertConnectionTreeView(studioTreeView, "Studio Client", "WebRTC", "Unavailable", "This connection is a studio instance without an open project. Connections can only be initiated from the other end.", false);
			},
		});
	},
});

Deno.test({
	name: "Connecting to a connection by clicking the button",
	async fn() {
		await basicTest({
			connections: [
				{
					id: "connection uuid",
					clientType: "studio-host",
					connectionState: "disconnected",
					connectionType: "renda:webrtc",
					projectMetadata: {
						fileSystemHasWritePermissions: true,
						name: "my project",
						uuid: "project uuid",
					},
				},
			],
			fn({studiosListTreeView, studioConnectionsManager}) {
				const studioTreeView = getChildTreeViewFromIndices(studiosListTreeView, 0);
				const {connectButtonGui} = assertConnectionTreeView(studioTreeView, "my project", "WebRTC", "Available", "", true);
				const requestConnectionSpy = spy(studioConnectionsManager, "requestConnection");

				connectButtonGui.click();

				assertSpyCalls(requestConnectionSpy, 1);
				assertSpyCall(requestConnectionSpy, 0, {
					args: ["connection uuid"],
				});
			},
		});
	},
});

Deno.test({
	name: "Changing connection status on an active connection",
	async fn() {
		/** @type {import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").StudioConnectionData} */
		const connection = {
			id: "uuid1",
			clientType: "studio-host",
			connectionState: "disconnected",
			connectionType: "renda:webrtc",
			projectMetadata: {
				fileSystemHasWritePermissions: true,
				name: "my project",
				uuid: "project uuid",
			},
		};
		await basicTest({
			connections: [connection],
			fn({studiosListTreeView, fireOnAvailableConnectionsChanged}) {
				const studioTreeView = getChildTreeViewFromIndices(studiosListTreeView, 0);
				assertConnectionTreeView(studioTreeView, "my project", "WebRTC", "Available", "", true);

				connection.connectionState = "connecting";
				fireOnAvailableConnectionsChanged();
				assertConnectionTreeView(studioTreeView, "my project", "WebRTC", "Connecting", "", false);

				connection.connectionState = "connected";
				fireOnAvailableConnectionsChanged();
				assertConnectionTreeView(studioTreeView, "my project", "WebRTC", "Connected", "", false);
			},
		});
	},
});

Deno.test({
	name: "Old connections get removed",
	async fn() {
		/** @type {import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").StudioConnectionData[]} */
		const connections = [
			{
				id: "uuid1",
				clientType: "studio-host",
				connectionState: "disconnected",
				connectionType: "renda:webrtc",
				projectMetadata: {
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
	name: "WebRTC discovery status changes",
	async fn() {
		await basicTest({
			fn({webRtcStatusLabel, fireOnWebRtcDiscoveryserverStatusChange}) {
				assertEquals(webRtcStatusLabel.value, "disconnected");
				fireOnWebRtcDiscoveryserverStatusChange("connecting");
				assertEquals(webRtcStatusLabel.value, "connecting");
			},
		});
	},
});

Deno.test({
	name: "Callbacks are unregistered when destructed",
	async fn() {
		/** @type {import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").StudioConnectionData[]} */
		const connections = [];
		await basicTest({
			connections,
			fn({contentWindow, studiosListTreeView, webRtcStatusLabel, fireOnAvailableConnectionsChanged, fireOnWebRtcDiscoveryserverStatusChange}) {
				connections.push({
					id: "uuid1",
					clientType: "studio-host",
					connectionState: "disconnected",
					connectionType: "renda:webrtc",
					projectMetadata: null,
				});
				fireOnAvailableConnectionsChanged();
				assertEquals(studiosListTreeView.children.length, 1);

				assertEquals(webRtcStatusLabel.value, "disconnected");
				fireOnWebRtcDiscoveryserverStatusChange("connecting");
				assertEquals(webRtcStatusLabel.value, "connecting");

				contentWindow.destructor();

				connections.pop();
				fireOnAvailableConnectionsChanged();
				assertEquals(studiosListTreeView.children.length, 1);

				fireOnWebRtcDiscoveryserverStatusChange("connected");
				assertEquals(webRtcStatusLabel.value, "connecting");
			},
		});
	},
});

Deno.test({
	name: "Discovery endpoint changes are passed to the studioConnectionsManager",
	async fn() {
		await basicTest({
			fn({contentWindow, studioConnectionsManager}) {
				const endPointTreeView = getChildTreeViewFromIndices(contentWindow.headerTreeView, 0);
				const setEndpointSpy = spy(studioConnectionsManager, "setWebRtcDiscoveryEndpoint");
				assertInstanceOf(endPointTreeView, PropertiesTreeViewEntry);
				assertInstanceOf(endPointTreeView.gui, TextGui);

				endPointTreeView.gui.setValue("new endpoint");
				assertSpyCalls(setEndpointSpy, 1);
				assertSpyCall(setEndpointSpy, 0, {
					args: ["new endpoint"],
				});
			},
		});
	},
});
