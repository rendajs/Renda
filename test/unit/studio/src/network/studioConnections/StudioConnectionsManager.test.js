import { Importer } from "fake-imports";
import { assertSpyCall, assertSpyCalls, spy, stub } from "std/testing/mock.ts";
import { createPreferencesManager } from "../../../shared/createPreferencesManager.js";
import { MemoryStudioFileSystem } from "../../../../../../studio/src/util/fileSystems/MemoryStudioFileSystem.js";
import { assert, assertEquals, assertInstanceOf } from "std/testing/asserts.ts";
import { assertLastDiscoveryManager, clearCreatedDiscoveryManagers } from "./shared/MockDiscoveryManager.js";
import { clearCreatedWebRtcDiscoveryMethods, getCreatedWebRtcDiscoveryMethods } from "./shared/MockWebRtcDiscoveryMethod.js";
import { clearCreatedInternalDiscoveryMethods, getCreatedInternalDiscoveryMethods } from "./shared/MockInternalDiscoveryMethod.js";
import { clearCreatedMessageHandlers, getCreatedMessageHandlers } from "../../../../src/network/studioConnections/discoveryMethods/shared/ExtendedDiscoveryMethod.js";
import { createMockAssetManager } from "../../../shared/createMockAssetManager.js";

const importer = new Importer(import.meta.url);
importer.makeReal("./shared/MockDiscoveryManager.js");
importer.makeReal("./shared/MockInternalDiscoveryMethod.js");
importer.makeReal("./shared/MockWebRtcDiscoveryMethod.js");
importer.redirectModule("../../../../../../src/network/studioConnections/DiscoveryManager.js", "./shared/MockDiscoveryManager.js");
importer.redirectModule("../../../../../../src/network/studioConnections/discoveryMethods/InternalDiscoveryMethod.js", "./shared/MockInternalDiscoveryMethod.js");
importer.redirectModule("../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js", "./shared/MockWebRtcDiscoveryMethod.js");

/** @type {import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js")} */
const StudioConnectionsManagerMod = await importer.import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js");
const { StudioConnectionsManager } = StudioConnectionsManagerMod;

/**
 * @typedef StudioConnectionsManagerTestContext
 * @property {import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").StudioConnectionsManager} manager
 * @property {(hasFileSystem: boolean) => void} setHasProjectFileSystem
 * @property {(currentProjectIsRemote: boolean) => void} setCurrentProjectIsRemote
 * @property {(currentProjectIsRemote: import("../../../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnectionProjectMetadata) => void} setCurrentProjectMetadata
 * @property {() => void} fireOnProjectOpen
 * @property {() => void} fireOnProjectOpenEntryChange
 * @property {import("../../../../../../studio/src/projectSelector/ProjectManager.js").ProjectManager} projectManager
 * @property {import("../../../../../../studio/src/preferences/PreferencesManager.js").PreferencesManager<{"studioConnections.enableRemoteDiscovery": {
 *type: "boolean",
 *},
 *"studioConnections.enableInternalDiscovery": {
 *type: "boolean",
 *}}>} preferencesManager
 */

/**
 * @param {object} options
 * @param {string} [options.location]
 * @param {(ctx: StudioConnectionsManagerTestContext) => Promise<void> | void} options.fn
 */
async function basicTest({
	location = "https://renda.studio/",
	fn,
}) {
	let randomUuid = 0;
	const mockUuid = stub(crypto, "randomUUID", () => {
		randomUuid++;
		return "random_uuid_" + randomUuid;
	});
	const oldLocation = window.location;
	try {
		window.location = /** @type {Location} */ (/** @type {unknown} */ (new URL(location)));

		/** @type {Set<() => void>} */
		const onProjectOpenCbs = new Set();
		/** @type {Set<(entry: import("../../../../../../studio/src/projectSelector/ProjectManager.js").StoredProjectEntryAny) => void>} */
		const onProjectOpenEntryChangeCbs = new Set();

		let currentProjectIsRemote = false;
		/** @type {import("../../../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnectionProjectMetadata?} */
		let currentProjectMetadata = null;

		const mockProjectManager = /** @type {import("../../../../../../studio/src/projectSelector/ProjectManager.js").ProjectManager} */ ({
			onProjectOpen(cb) {
				onProjectOpenCbs.add(cb);
			},
			onRootHasWritePermissionsChange(cb) {},
			onProjectOpenEntryChange(cb) {
				onProjectOpenEntryChangeCbs.add(cb);
			},
			getCurrentProjectMetadata() {
				return currentProjectMetadata;
			},
			get currentProjectIsRemote() {
				return currentProjectIsRemote;
			},
			assignRemoteConnection(connection) {},
			getRemoteFileSystem() {},
		});
		const { preferencesManager } = createPreferencesManager({
			"studioConnections.enableRemoteDiscovery": {
				type: "boolean",
			},
			"studioConnections.enableInternalDiscovery": {
				type: "boolean",
			},
		});

		const manager = new StudioConnectionsManager(mockProjectManager, preferencesManager);

		await fn({
			manager,
			projectManager: mockProjectManager,
			preferencesManager,
			fireOnProjectOpen() {
				onProjectOpenCbs.forEach(cb => cb());
			},
			fireOnProjectOpenEntryChange() {
				const entry = /** @type {import("../../../../../../studio/src/projectSelector/ProjectManager.js").StoredProjectEntryAny} */ ({});
				onProjectOpenEntryChangeCbs.forEach(cb => cb(entry));
			},
			setHasProjectFileSystem(hasFileSystem) {
				mockProjectManager.currentProjectFileSystem = hasFileSystem ? new MemoryStudioFileSystem() : null;
				if (hasFileSystem) {
					const { assetManager } = createMockAssetManager();
					mockProjectManager.assetManager = assetManager;
				} else {
					mockProjectManager.assetManager = null;
				}
			},
			setCurrentProjectIsRemote(newCurrentProjectIsRemote) {
				currentProjectIsRemote = newCurrentProjectIsRemote;
			},
			setCurrentProjectMetadata(metadata) {
				currentProjectMetadata = metadata;
			},
		});
	} finally {
		window.location = oldLocation;
		mockUuid.restore();
		clearCreatedDiscoveryManagers();
		clearCreatedWebRtcDiscoveryMethods();
		clearCreatedInternalDiscoveryMethods();
		clearCreatedMessageHandlers();
	}
}

/**
 * Asserts that the specified amount of WebRTC discovery methods was created and returns the last one.
 * @param {number} length
 */
function assertLastWebRtcDiscoveryMethod(length = 1) {
	const discoveryManagers = Array.from(getCreatedWebRtcDiscoveryMethods());
	assertEquals(discoveryManagers.length, length);
	return discoveryManagers[length - 1];
}

/**
 * Asserts that the specified amount of internal discovery methods was created and returns the last one.
 * @param {number} length
 */
function assertLastInternalDiscoveryManager(length = 1) {
	const discoveryManagers = Array.from(getCreatedInternalDiscoveryMethods());
	assertEquals(discoveryManagers.length, length);
	return discoveryManagers[length - 1];
}

/**
 * Asserts that the specified amount of MessageHandlers were created and returns the last one.
 * @param {number} length
 */
function assertLastMessageHandler(length = 1) {
	const discoveryManagers = Array.from(getCreatedMessageHandlers());
	assertEquals(discoveryManagers.length, length);
	return discoveryManagers[length - 1];
}

Deno.test({
	name: "Opening a project creates a discovery manager",
	async fn() {
		await basicTest({
			fn({ fireOnProjectOpen, setHasProjectFileSystem }) {
				setHasProjectFileSystem(true);
				fireOnProjectOpen();

				const discoveryManager = assertLastDiscoveryManager();
				assertEquals(discoveryManager.getCreatedDiscoveryMethods(), [
					{
						type: "renda:internal",
					},
				]);
			},
		});
	},
});

Deno.test({
	name: "Changing studioConnections.enableRemoteDiscovery and discovery endpoint creates and destroys the webrtc discovery method",
	async fn() {
		await basicTest({
			fn({ manager, preferencesManager, setCurrentProjectMetadata, fireOnProjectOpen, setHasProjectFileSystem }) {
				setHasProjectFileSystem(true);
				setCurrentProjectMetadata({
					fileSystemHasWritePermissions: true,
					name: "project name",
					uuid: "id",
				});
				fireOnProjectOpen();
				/** @type {import("../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js").OnDiscoveryManagerWebRtcStatusChangeCallback} */
				const onStatusChangeFn = () => {};
				const onStatusChangeSpy = spy(onStatusChangeFn);
				manager.onWebRtcDiscoveryServerStatusChange(onStatusChangeSpy);

				const discoveryManager = assertLastDiscoveryManager();
				assertEquals(discoveryManager.getCreatedDiscoveryMethods(), [
					{
						type: "renda:internal",
					},
				]);

				assertSpyCalls(onStatusChangeSpy, 0);

				preferencesManager.set("studioConnections.enableRemoteDiscovery", true);

				assertLastDiscoveryManager();
				assertEquals(discoveryManager.getCreatedDiscoveryMethods(), [
					{
						type: "renda:internal",
					},
					{
						type: "renda:webrtc",
					},
				]);
				assertSpyCalls(onStatusChangeSpy, 1);
				assertSpyCall(onStatusChangeSpy, 0, {
					args: ["connecting"],
				});
				assertEquals(manager.webRtcDiscoveryServerStatus, "connecting");

				const discoveryMethod = assertLastWebRtcDiscoveryMethod();
				assertEquals(discoveryMethod.endpoint, "wss://discovery.renda.studio/");
				assertSpyCalls(discoveryMethod.setProjectMetadataSpy, 1);
				assertSpyCall(discoveryMethod.setProjectMetadataSpy, 0, {
					args: [
						{
							fileSystemHasWritePermissions: true,
							name: "project name",
							uuid: "id",
						},
					],
				});

				discoveryMethod.setStatus("connected");
				assertSpyCalls(onStatusChangeSpy, 2);
				assertSpyCall(onStatusChangeSpy, 1, {
					args: ["connected"],
				});
				assertEquals(manager.webRtcDiscoveryServerStatus, "connected");

				preferencesManager.set("studioConnections.enableRemoteDiscovery", false);
				assertEquals(discoveryMethod.destructed, true);
				assertSpyCalls(onStatusChangeSpy, 3);
				assertSpyCall(onStatusChangeSpy, 2, {
					args: ["disconnected"],
				});
				assertEquals(manager.webRtcDiscoveryServerStatus, "disconnected");

				preferencesManager.set("studioConnections.enableRemoteDiscovery", true);

				const discoveryMethod2 = assertLastWebRtcDiscoveryMethod(2);
				assertEquals(discoveryMethod2.endpoint, "wss://discovery.renda.studio/");

				discoveryMethod2.setStatus("connected");
				assertSpyCalls(onStatusChangeSpy, 5);
				assertSpyCall(onStatusChangeSpy, 4, {
					args: ["connected"],
				});
				assertEquals(manager.webRtcDiscoveryServerStatus, "connected");

				manager.setWebRtcDiscoveryEndpoint("wss://example.com/newendpoint");

				const discoveryMethod3 = assertLastWebRtcDiscoveryMethod(3);
				assertEquals(discoveryMethod3.endpoint, "wss://example.com/newendpoint");

				assertSpyCalls(onStatusChangeSpy, 7);
				assertSpyCall(onStatusChangeSpy, 5, {
					args: ["disconnected"],
				});
				assertSpyCall(onStatusChangeSpy, 6, {
					args: ["connecting"],
				});
				assertEquals(manager.webRtcDiscoveryServerStatus, "connecting");

				manager.removeOnWebRtcDiscoveryServerStatusChange(onStatusChangeSpy);
				discoveryMethod3.setStatus("disconnected");
				assertSpyCalls(onStatusChangeSpy, 7);
			},
		});
	},
});

Deno.test({
	name: "getDefaultWebRtcDiscoveryEndpoint on main domain",
	async fn() {
		await basicTest({
			fn({ manager }) {
				assertEquals(manager.getDefaultWebRtcDiscoveryEndpoint(), "wss://discovery.renda.studio/");
			},
		});
	},
});

Deno.test({
	name: "getDefaultWebRtcDiscoveryEndpoint on subdomain domain",
	async fn() {
		await basicTest({
			location: "https://canary.renda.studio",
			fn({ manager }) {
				assertEquals(manager.getDefaultWebRtcDiscoveryEndpoint(), "wss://discovery.renda.studio/");
			},
		});
	},
});

Deno.test({
	name: "getDefaultWebRtcDiscoveryEndpoint on localhost",
	async fn() {
		await basicTest({
			location: "http://localhost:8080",
			fn({ manager }) {
				assertEquals(manager.getDefaultWebRtcDiscoveryEndpoint(), "ws://localhost:8080/studioDiscovery");
			},
		});
	},
});

Deno.test({
	name: "getDefaultWebRtcDiscoveryEndpoint on secure localhost",
	async fn() {
		await basicTest({
			location: "https://localhost:8080",
			fn({ manager }) {
				assertEquals(manager.getDefaultWebRtcDiscoveryEndpoint(), "wss://localhost:8080/studioDiscovery");
			},
		});
	},
});

Deno.test({
	name: "Switching to a remote project recreates the discovery manager",
	async fn() {
		await basicTest({
			fn({ setHasProjectFileSystem, fireOnProjectOpen, setCurrentProjectIsRemote, fireOnProjectOpenEntryChange }) {
				setHasProjectFileSystem(true);
				fireOnProjectOpen();

				const discoveryManager1 = assertLastDiscoveryManager();
				assertEquals(discoveryManager1.clientType, "studio-host");

				setCurrentProjectIsRemote(true);
				fireOnProjectOpenEntryChange();

				assertEquals(discoveryManager1.destructed, true);
				const discoveryManager2 = assertLastDiscoveryManager(2);
				assertEquals(discoveryManager2.clientType, "studio-client");
			},
		});
	},
});

Deno.test({
	name: "List and update available connections",
	async fn() {
		await basicTest({
			fn({ manager, setHasProjectFileSystem, fireOnProjectOpen }) {
				assertEquals(Array.from(manager.getConnections()), []);

				setHasProjectFileSystem(true);
				fireOnProjectOpen();

				const onConnectionsChangedSpy = spy();
				manager.onConnectionsChanged(onConnectionsChangedSpy);

				const discoveryMethod = assertLastInternalDiscoveryManager();
				discoveryMethod.addOne({
					clientType: "inspector",
					id: "id",
					projectMetadata: null,
				});

				assertSpyCalls(onConnectionsChangedSpy, 1);
				assertEquals(Array.from(manager.getConnections()), [
					{
						clientType: "inspector",
						connectionState: "disconnected",
						connectionType: "renda:internal",
						id: "id",
						projectMetadata: null,
					},
				]);

				manager.removeOnConnectionsChanged(onConnectionsChangedSpy);
				discoveryMethod.addOne({
					clientType: "inspector",
					id: "id2",
					projectMetadata: null,
				});
				assertSpyCalls(onConnectionsChangedSpy, 1);
			},
		});
	},
});

Deno.test({
	name: "Internal discovery method is informed of project metadata changes",
	async fn() {
		await basicTest({
			fn({ manager, preferencesManager, setHasProjectFileSystem, fireOnProjectOpen, setCurrentProjectMetadata }) {
				setHasProjectFileSystem(true);

				setCurrentProjectMetadata({
					fileSystemHasWritePermissions: true,
					name: "project name",
					uuid: "id",
				});
				fireOnProjectOpen();

				const method = assertLastInternalDiscoveryManager();
				assertSpyCalls(method.setProjectMetadataSpy, 0);

				preferencesManager.set("studioConnections.enableInternalDiscovery", true);
				assertSpyCalls(method.setProjectMetadataSpy, 1);
				assertSpyCall(method.setProjectMetadataSpy, 0, {
					args: [
						{
							fileSystemHasWritePermissions: true,
							name: "project name",
							uuid: "id",
						},
					],
				});

				setCurrentProjectMetadata({
					fileSystemHasWritePermissions: true,
					name: "other project name",
					uuid: "other id",
				});
				fireOnProjectOpen();
				assertSpyCalls(method.setProjectMetadataSpy, 2);
				assertSpyCall(method.setProjectMetadataSpy, 1, {
					args: [
						{
							fileSystemHasWritePermissions: true,
							name: "other project name",
							uuid: "other id",
						},
					],
				});

				// Trigger an update with the same data to make sure the metadata isn't sent unnecessarily
				setCurrentProjectMetadata({
					fileSystemHasWritePermissions: true,
					name: "other project name",
					uuid: "other id",
				});
				preferencesManager.set("studioConnections.enableRemoteDiscovery", true);
				assertSpyCalls(method.setProjectMetadataSpy, 2);

				preferencesManager.set("studioConnections.enableInternalDiscovery", false);
				assertSpyCalls(method.setProjectMetadataSpy, 3);
				assertSpyCall(method.setProjectMetadataSpy, 2, {
					args: [null],
				});
			},
		});
	},
});

Deno.test({
	name: "getInternalClientUuid",
	async fn() {
		await basicTest({
			async fn({ manager }) {
				assertEquals(await manager.getInternalClientUuid(), "client uuid");
			},
		});
	},
});

Deno.test({
	name: "Connecting to a studio-host from a studio-client, automatically accepted since we initiated it",
	async fn() {
		await basicTest({
			fn({ manager, projectManager, setHasProjectFileSystem, setCurrentProjectIsRemote, fireOnProjectOpen }) {
				const onConnectionsChangedSpy = spy();
				manager.onConnectionsChanged(onConnectionsChangedSpy);
				setHasProjectFileSystem(true);
				setCurrentProjectIsRemote(true);
				fireOnProjectOpen();

				const discoveryMethod = assertLastInternalDiscoveryManager(2);
				const requestConnectionSpy = spy(discoveryMethod, "requestConnection");
				discoveryMethod.addOne({
					clientType: "studio-host",
					id: "connection id",
					projectMetadata: {
						fileSystemHasWritePermissions: true,
						name: "My Project",
						uuid: "project uuid",
					},
				});
				assertSpyCalls(onConnectionsChangedSpy, 1);

				manager.requestConnection("connection id");
				assertSpyCalls(requestConnectionSpy, 1);
				assertSpyCall(requestConnectionSpy, 0, {
					args: ["connection id", undefined],
				});

				const assignRemoteConnectionSpy = spy(projectManager, "assignRemoteConnection");

				discoveryMethod.addActive("connection id", true, {}, 0, "");
				assertSpyCalls(assignRemoteConnectionSpy, 1);
				assertSpyCalls(onConnectionsChangedSpy, 2);
				assertEquals(Array.from(manager.getConnections()), [
					{
						clientType: "studio-host",
						connectionState: "connecting",
						connectionType: "renda:internal",
						id: "connection id",
						projectMetadata: {
							fileSystemHasWritePermissions: true,
							name: "My Project",
							uuid: "project uuid",
						},
					},
				]);

				const messageHandler = assertLastMessageHandler();
				messageHandler.markAsConnected();
				assertSpyCalls(onConnectionsChangedSpy, 3);
				assertEquals(Array.from(manager.getConnections()), [
					{
						clientType: "studio-host",
						connectionState: "connected",
						connectionType: "renda:internal",
						id: "connection id",
						projectMetadata: {
							fileSystemHasWritePermissions: true,
							name: "My Project",
							uuid: "project uuid",
						},
					},
				]);
			},
		});
	},
});

Deno.test({
	name: "Receiving a studio-client connection to a studio-host, accepting it",
	async fn() {
		await basicTest({
			fn({ manager, setHasProjectFileSystem, setCurrentProjectIsRemote, fireOnProjectOpen }) {
				const onConnectionsChangedSpy = spy();
				manager.onConnectionsChanged(onConnectionsChangedSpy);
				setHasProjectFileSystem(true);
				setCurrentProjectIsRemote(false);
				fireOnProjectOpen();

				const discoveryMethod = assertLastInternalDiscoveryManager();
				const requestConnectionSpy = spy(discoveryMethod, "requestConnection");
				discoveryMethod.addOne({
					clientType: "studio-client",
					id: "connection id",
					projectMetadata: null,
				});
				assertSpyCalls(onConnectionsChangedSpy, 1);

				manager.requestConnection("connection id");
				assertSpyCalls(requestConnectionSpy, 1);
				assertSpyCall(requestConnectionSpy, 0, {
					args: ["connection id", undefined],
				});

				discoveryMethod.addActive("connection id", false, {}, 0, "");
				assertSpyCalls(onConnectionsChangedSpy, 2);
				assertEquals(Array.from(manager.getConnections()), [
					{
						clientType: "studio-client",
						connectionState: "incoming-permission-pending",
						connectionType: "renda:internal",
						id: "connection id",
						projectMetadata: null,
					},
				]);

				manager.acceptIncomingConnection("connection id");
				assertSpyCalls(onConnectionsChangedSpy, 3);
				assertEquals(Array.from(manager.getConnections()), [
					{
						clientType: "studio-client",
						connectionState: "connecting",
						connectionType: "renda:internal",
						id: "connection id",
						projectMetadata: null,
					},
				]);

				const messageHandler = assertLastMessageHandler();
				messageHandler.markAsConnected();
				assertSpyCalls(onConnectionsChangedSpy, 4);
				assertEquals(Array.from(manager.getConnections()), [
					{
						clientType: "studio-client",
						connectionState: "connected",
						connectionType: "renda:internal",
						id: "connection id",
						projectMetadata: null,
					},
				]);
			},
		});
	},
});

Deno.test({
	name: "Receiving studio-client connection throws when there is no file system",
	async fn() {
		await basicTest({
			fn() {
				// DiscoveryManager callback errors are printed to the console instead of thrown
				const consoleErrorSpy = stub(console, "error");

				try {
					const discoveryMethod = assertLastInternalDiscoveryManager();
					discoveryMethod.addOne({
						clientType: "studio-client",
						id: "connection id",
						projectMetadata: null,
					});
					discoveryMethod.addActive("connection id", false, {}, 0, "");

					assertSpyCalls(consoleErrorSpy, 1);
					const error = consoleErrorSpy.calls[0].args[0];
					assertInstanceOf(error, Error);
					const expectedText = "Failed to accept incoming connection, no active file system.";
					assert(error.message.includes(expectedText), `Expected error message to contain "${expectedText}"`);
				} finally {
					consoleErrorSpy.restore();
				}
			},
		});
	},
});

Deno.test({
	name: "Throws when a studio-host tries to connect to a studio-client",
	async fn() {
		await basicTest({
			fn({ setHasProjectFileSystem, setCurrentProjectIsRemote, fireOnProjectOpen }) {
				setHasProjectFileSystem(true);
				setCurrentProjectIsRemote(true);
				fireOnProjectOpen();

				// DiscoveryManager callback errors are printed to the console instead of thrown
				const consoleErrorSpy = stub(console, "error");

				try {
					const discoveryMethod = assertLastInternalDiscoveryManager(2);
					discoveryMethod.addOne({
						clientType: "studio-host",
						id: "connection id",
						projectMetadata: null,
					});
					discoveryMethod.addActive("connection id", false, {}, 0, "");

					assertSpyCalls(consoleErrorSpy, 1);
					const error = consoleErrorSpy.calls[0].args[0];
					assertInstanceOf(error, Error);
					const expectedText = 'a "studio-host" connection cannot connect to a "studio-client"';
					assert(error.message.includes(expectedText), `Expected error message to contain "${expectedText}"`);
				} finally {
					consoleErrorSpy.restore();
				}
			},
		});
	},
});

Deno.test({
	name: "Receiving an inspector connection, accepting it",
	async fn() {
		await basicTest({
			fn({ manager, setHasProjectFileSystem, setCurrentProjectIsRemote, fireOnProjectOpen }) {
				const onConnectionsChangedSpy = spy();
				manager.onConnectionsChanged(onConnectionsChangedSpy);
				setHasProjectFileSystem(true);
				setCurrentProjectIsRemote(false);
				fireOnProjectOpen();

				const discoveryMethod = assertLastInternalDiscoveryManager();
				const requestConnectionSpy = spy(discoveryMethod, "requestConnection");
				discoveryMethod.addOne({
					clientType: "inspector",
					id: "connection id",
					projectMetadata: null,
				});
				assertSpyCalls(onConnectionsChangedSpy, 1);

				manager.requestConnection("connection id");
				assertSpyCalls(requestConnectionSpy, 1);
				assertSpyCall(requestConnectionSpy, 0, {
					args: ["connection id", undefined],
				});

				discoveryMethod.addActive("connection id", false, {}, 0, "");
				assertSpyCalls(onConnectionsChangedSpy, 2);
				assertEquals(Array.from(manager.getConnections()), [
					{
						clientType: "inspector",
						connectionState: "incoming-permission-pending",
						connectionType: "renda:internal",
						id: "connection id",
						projectMetadata: null,
					},
				]);

				manager.acceptIncomingConnection("connection id");
				assertSpyCalls(onConnectionsChangedSpy, 3);
				assertEquals(Array.from(manager.getConnections()), [
					{
						clientType: "inspector",
						connectionState: "connecting",
						connectionType: "renda:internal",
						id: "connection id",
						projectMetadata: null,
					},
				]);

				const messageHandler = assertLastMessageHandler();
				messageHandler.markAsConnected();
				assertSpyCalls(onConnectionsChangedSpy, 4);
				assertEquals(Array.from(manager.getConnections()), [
					{
						clientType: "inspector",
						connectionState: "connected",
						connectionType: "renda:internal",
						id: "connection id",
						projectMetadata: null,
					},
				]);
			},
		});
	},
});

Deno.test({
	name: "Receiving inspector connection throws when there is no asset manager",
	async fn() {
		await basicTest({
			fn() {
				// DiscoveryManager callback errors are printed to the console instead of thrown
				const consoleErrorSpy = stub(console, "error");

				try {
					const discoveryMethod = assertLastInternalDiscoveryManager();
					discoveryMethod.addOne({
						clientType: "inspector",
						id: "connection id",
						projectMetadata: null,
					});
					discoveryMethod.addActive("connection id", false, {}, 0, "");

					assertSpyCalls(consoleErrorSpy, 1);
					const error = consoleErrorSpy.calls[0].args[0];
					assertInstanceOf(error, Error);
					const expectedText = "Failed to accept incoming connection, no active asset manager.";
					assert(error.message.includes(expectedText), `Expected error message to contain "${expectedText}"`);
				} finally {
					consoleErrorSpy.restore();
				}
			},
		});
	},
});

Deno.test({
	name: "Inspector connections with a connection token are automatically accepted",
	async fn() {
		await basicTest({
			fn({ manager, setHasProjectFileSystem, setCurrentProjectIsRemote, fireOnProjectOpen }) {
				const onConnectionsChangedSpy = spy();
				manager.onConnectionsChanged(onConnectionsChangedSpy);
				setHasProjectFileSystem(true);
				setCurrentProjectIsRemote(false);
				fireOnProjectOpen();

				const discoveryMethod = assertLastInternalDiscoveryManager();
				const requestConnectionSpy = spy(discoveryMethod, "requestConnection");
				discoveryMethod.addOne({
					clientType: "inspector",
					id: "connection id",
					projectMetadata: null,
				});
				assertSpyCalls(onConnectionsChangedSpy, 1);

				manager.requestConnection("connection id");
				assertSpyCalls(requestConnectionSpy, 1);
				assertSpyCall(requestConnectionSpy, 0, {
					args: ["connection id", undefined],
				});

				const token = manager.createConnectionToken();

				discoveryMethod.addActive("connection id", false, { token }, 0, "");
				assertSpyCalls(onConnectionsChangedSpy, 2);
				assertEquals(Array.from(manager.getConnections()), [
					{
						clientType: "inspector",
						connectionState: "connecting",
						connectionType: "renda:internal",
						id: "connection id",
						projectMetadata: null,
					},
				]);

				const messageHandler = assertLastMessageHandler();
				messageHandler.markAsConnected();
				assertSpyCalls(onConnectionsChangedSpy, 3);
				assertEquals(Array.from(manager.getConnections()), [
					{
						clientType: "inspector",
						connectionState: "connected",
						connectionType: "renda:internal",
						id: "connection id",
						projectMetadata: null,
					},
				]);
			},
		});
	},
});

Deno.test({
	name: "Throws when an invalid configuration tries to connect",
	async fn() {
		await basicTest({
			fn({ manager, setHasProjectFileSystem, setCurrentProjectIsRemote, fireOnProjectOpen }) {
				setHasProjectFileSystem(true);
				setCurrentProjectIsRemote(false);
				fireOnProjectOpen();

				// DiscoveryManager callback errors are printed to the console instead of thrown
				const consoleErrorSpy = stub(console, "error");

				try {
					const discoveryMethod = assertLastInternalDiscoveryManager();
					discoveryMethod.addOne({
						clientType: "studio-host",
						id: "host id",
						projectMetadata: null,
					});
					discoveryMethod.addActive("host id", false, {}, 0, "");

					assertSpyCalls(consoleErrorSpy, 1);
					const error = consoleErrorSpy.calls[0].args[0];
					assertInstanceOf(error, Error);
					const expectedText = 'tried to connect two connections that are incompatible: "studio-host" tried to connect to "studio-host"';
					assert(error.message.includes(expectedText), `Expected error message to contain "${expectedText}"`);
				} finally {
					consoleErrorSpy.restore();
				}
			},
		});
	},
});
