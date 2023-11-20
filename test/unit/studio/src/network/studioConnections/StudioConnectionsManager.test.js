import {Importer} from "fake-imports";
import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {createPreferencesManager} from "../../../shared/createPreferencesManager.js";
import {MemoryStudioFileSystem} from "../../../../../../studio/src/util/fileSystems/MemoryStudioFileSystem.js";
import {assertEquals} from "std/testing/asserts.ts";
import {clearCreatedDiscoveryManagers, getCreatedDiscoveryManagers} from "./shared/MockDiscoveryManager.js";
import {clearCreatedWebRtcDiscoveryMethods, getCreatedWebRtcDiscoveryMethods} from "./shared/MockWebRtcDiscoveryMethod.js";
import {clearCreatedInternalDiscoveryMethods, getCreatedInternalDiscoveryMethods} from "./shared/MockInternalDiscoveryMethod.js";
import {assertPromiseResolved} from "../../../../shared/asserts.js";

const importer = new Importer(import.meta.url);
importer.makeReal("./shared/MockDiscoveryManager.js");
importer.makeReal("./shared/MockInternalDiscoveryMethod.js");
importer.makeReal("./shared/MockWebRtcDiscoveryMethod.js");
importer.redirectModule("../../../../../../src/network/studioConnections/DiscoveryManager.js", "./shared/MockDiscoveryManager.js");
importer.redirectModule("../../../../../../src/network/studioConnections/discoveryMethods/InternalDiscoveryMethod.js", "./shared/MockInternalDiscoveryMethod.js");
importer.redirectModule("../../../../../../src/network/studioConnections/discoveryMethods/WebRtcDiscoveryMethod.js", "./shared/MockWebRtcDiscoveryMethod.js");

/** @type {import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js")} */
const StudioConnectionsManagerMod = await importer.import("../../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js");
const {StudioConnectionsManager} = StudioConnectionsManagerMod;

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
		});
		const {preferencesManager} = createPreferencesManager({
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
	}
}

/**
 * Asserts that the specified amount of discovery managers was created and returns the last one.
 * @param {number} length
 */
function assertLastDiscoveryManager(length = 1) {
	const discoveryManagers = Array.from(getCreatedDiscoveryManagers());
	assertEquals(discoveryManagers.length, length);
	return discoveryManagers[length - 1];
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
function assertLastInternalDiscoveryMethod(length = 1) {
	const discoveryManagers = Array.from(getCreatedInternalDiscoveryMethods());
	assertEquals(discoveryManagers.length, length);
	return discoveryManagers[length - 1];
}

Deno.test({
	name: "Opening a project creates a discovery manager",
	fn() {
		basicTest({
			fn({manager, fireOnProjectOpen, setHasProjectFileSystem}) {
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
	fn() {
		basicTest({
			fn({manager, preferencesManager, setCurrentProjectMetadata, fireOnProjectOpen, setHasProjectFileSystem}) {
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
	fn() {
		basicTest({
			fn({manager}) {
				assertEquals(manager.getDefaultWebRtcDiscoveryEndpoint(), "wss://discovery.renda.studio/");
			},
		});
	},
});

Deno.test({
	name: "getDefaultWebRtcDiscoveryEndpoint on subdomain domain",
	fn() {
		basicTest({
			location: "https://canary.renda.studio",
			fn({manager}) {
				assertEquals(manager.getDefaultWebRtcDiscoveryEndpoint(), "wss://discovery.renda.studio/");
			},
		});
	},
});

Deno.test({
	name: "getDefaultWebRtcDiscoveryEndpoint on localhost",
	fn() {
		basicTest({
			location: "http://localhost:8080",
			fn({manager}) {
				assertEquals(manager.getDefaultWebRtcDiscoveryEndpoint(), "ws://localhost:8080/studioDiscovery");
			},
		});
	},
});

Deno.test({
	name: "getDefaultWebRtcDiscoveryEndpoint on secure localhost",
	fn() {
		basicTest({
			location: "https://localhost:8080",
			fn({manager}) {
				assertEquals(manager.getDefaultWebRtcDiscoveryEndpoint(), "wss://localhost:8080/studioDiscovery");
			},
		});
	},
});

Deno.test({
	name: "Switching to a remote project recreates the discovery manager",
	fn() {
		basicTest({
			fn({setHasProjectFileSystem, fireOnProjectOpen, setCurrentProjectIsRemote, fireOnProjectOpenEntryChange}) {
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
	fn() {
		basicTest({
			fn({manager, setHasProjectFileSystem, fireOnProjectOpen}) {
				assertEquals(Array.from(manager.getConnections()), []);

				setHasProjectFileSystem(true);
				fireOnProjectOpen();

				const onConnectionsChangedSpy = spy();
				manager.onConnectionsChanged(onConnectionsChangedSpy);

				const discoveryMethod = assertLastInternalDiscoveryMethod();
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
	fn() {
		basicTest({
			fn({manager, preferencesManager, setHasProjectFileSystem, fireOnProjectOpen, setCurrentProjectMetadata}) {
				setHasProjectFileSystem(true);

				setCurrentProjectMetadata({
					fileSystemHasWritePermissions: true,
					name: "project name",
					uuid: "id",
				});
				fireOnProjectOpen();

				const method = assertLastInternalDiscoveryMethod();
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
			async fn({manager, fireOnProjectOpen, setHasProjectFileSystem}) {
				assertEquals(await manager.getInternalClientUuid(), null);
				setHasProjectFileSystem(true);
				fireOnProjectOpen();

				assertEquals(await manager.getInternalClientUuid(), "client uuid");
			},
		});
	},
});

Deno.test({
	name: "requestSpecificConnection() connects when it is already available",
	async fn() {
		await basicTest({
			async fn({manager, setHasProjectFileSystem, setCurrentProjectIsRemote, fireOnProjectOpen}) {
				setHasProjectFileSystem(true);
				setCurrentProjectIsRemote(true);
				fireOnProjectOpen();

				const discoveryManager = assertLastDiscoveryManager();
				const requestConnectionSpy = spy(discoveryManager, "requestConnection");

				const discoveryMethod = assertLastInternalDiscoveryMethod();
				discoveryMethod.addOne({
					clientType: "studio-host",
					id: "wrong connection id",
					projectMetadata: {
						fileSystemHasWritePermissions: true,
						name: "My Project",
						uuid: "wrong project uuid",
					},
				});
				discoveryMethod.addOne({
					clientType: "studio-host",
					id: "expected connection id",
					projectMetadata: {
						fileSystemHasWritePermissions: true,
						name: "My Project",
						uuid: "expected project uuid",
					},
				});

				const promise = manager.requestSpecificConnection({
					connectionType: "renda:internal",
					projectUuid: "expected project uuid",
				});
				await assertPromiseResolved(promise, true);
				assertSpyCalls(requestConnectionSpy, 1);
				assertSpyCall(requestConnectionSpy, 0, {
					args: ["expected connection id"],
				});
			},
		});
	},
});

Deno.test({
	name: "requestSpecificConnection() connects once the connection becomes available",
	async fn() {
		await basicTest({
			async fn({manager, setHasProjectFileSystem, setCurrentProjectIsRemote, fireOnProjectOpen}) {
				setHasProjectFileSystem(true);
				setCurrentProjectIsRemote(true);
				fireOnProjectOpen();

				const discoveryManager = assertLastDiscoveryManager();
				const requestConnectionSpy = spy(discoveryManager, "requestConnection");
				const discoveryMethod = assertLastInternalDiscoveryMethod();

				const promise = manager.requestSpecificConnection({
					connectionType: "renda:internal",
					projectUuid: "expected project uuid",
				});
				await assertPromiseResolved(promise, false);

				discoveryMethod.addOne({
					clientType: "studio-host",
					id: "wrong connection id",
					projectMetadata: {
						fileSystemHasWritePermissions: true,
						name: "My Project",
						uuid: "wrong project uuid",
					},
				});
				await assertPromiseResolved(promise, false);
				assertSpyCalls(requestConnectionSpy, 0);

				discoveryMethod.addOne({
					clientType: "studio-host",
					id: "expected connection id",
					projectMetadata: {
						fileSystemHasWritePermissions: true,
						name: "My Project",
						uuid: "expected project uuid",
					},
				});
				await assertPromiseResolved(promise, true);
				assertSpyCalls(requestConnectionSpy, 1);
				assertSpyCall(requestConnectionSpy, 0, {
					args: ["expected connection id"],
				});
			},
		});
	},
});

Deno.test({
	name: "requestSpecificConnection() can be called even when no project has been opened yet",
	async fn() {
		await basicTest({
			async fn({manager, setHasProjectFileSystem, setCurrentProjectIsRemote, fireOnProjectOpen}) {
				const promise = manager.requestSpecificConnection({
					connectionType: "renda:internal",
					projectUuid: "expected project uuid",
				});
				await assertPromiseResolved(promise, false);

				setHasProjectFileSystem(true);
				setCurrentProjectIsRemote(true);
				fireOnProjectOpen();

				const discoveryManager = assertLastDiscoveryManager();
				const requestConnectionSpy = spy(discoveryManager, "requestConnection");
				const discoveryMethod = assertLastInternalDiscoveryMethod();

				discoveryMethod.addOne({
					clientType: "studio-host",
					id: "expected connection id",
					projectMetadata: {
						fileSystemHasWritePermissions: true,
						name: "My Project",
						uuid: "expected project uuid",
					},
				});
				await assertPromiseResolved(promise, true);
				assertSpyCalls(requestConnectionSpy, 1);
				assertSpyCall(requestConnectionSpy, 0, {
					args: ["expected connection id"],
				});
			},
		});
	},
});
