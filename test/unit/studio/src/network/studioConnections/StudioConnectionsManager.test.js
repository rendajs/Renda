import {Importer} from "fake-imports";
import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {createPreferencesManager} from "../../../shared/createPreferencesManager.js";
import {MemoryStudioFileSystem} from "../../../../../../studio/src/util/fileSystems/MemoryStudioFileSystem.js";
import {assertEquals} from "std/testing/asserts.ts";
import {clearCreatedDiscoveryManagers, getCreatedDiscoveryManagers} from "./shared/MockDiscoveryManager.js";
import {clearCreatedWebRtcDiscoveryMethods, getCreatedWebRtcDiscoveryMethods} from "./shared/MockWebRtcDiscoveryMethod.js";

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
 * @property {() => void} fireOnProjectOpen
 * @property {import("../../../../../../studio/src/preferences/PreferencesManager.js").PreferencesManager<{"studioConnections.enableRemoteDiscovery": {
 *type: "boolean",
 *},
 *"studioConnections.enableInternalDiscovery": {
 *type: "boolean",
 *}}>} preferencesManager
 */

// const OTHER_CLIENT_ID = "other_client_id";

/**
 * @param {object} options
 * @param {(ctx: StudioConnectionsManagerTestContext) => void} options.fn
 */
function basicTest({
	fn,
}) {
	let randomUuid = 0;
	const mockUuid = stub(crypto, "randomUUID", () => {
		randomUuid++;
		return "random_uuid_" + randomUuid;
	});
	const oldLocation = window.location;
	try {
		window.location = /** @type {Location} */ ({
			href: "https://renda.studio/",
			hostname: "renda.studio",
		});

		/** @type {Set<() => void>} */
		const onProjectOpenCbs = new Set();

		const mockProjectManager = /** @type {import("../../../../../../studio/src/projectSelector/ProjectManager.js").ProjectManager} */ ({
			onProjectOpen(cb) {
				onProjectOpenCbs.add(cb);
			},
			onRootHasWritePermissionsChange(cb) {},
			onProjectOpenEntryChange(cb) {},
			getCurrentProjectMetadata() {
				return null;
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

		fn({
			manager,
			preferencesManager,
			fireOnProjectOpen() {
				onProjectOpenCbs.forEach(cb => cb());
			},
			setHasProjectFileSystem(hasFileSystem) {
				mockProjectManager.currentProjectFileSystem = hasFileSystem ? new MemoryStudioFileSystem() : null;
			},
		});
	} finally {
		window.location = oldLocation;
		mockUuid.restore();
		clearCreatedDiscoveryManagers();
		clearCreatedWebRtcDiscoveryMethods();
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
			fn({manager, preferencesManager, fireOnProjectOpen, setHasProjectFileSystem}) {
				setHasProjectFileSystem(true);
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

				const discoveryMethod = assertLastWebRtcDiscoveryMethod();
				assertEquals(discoveryMethod.endpoint, "wss://discovery.renda.studio/");

				discoveryMethod.setStatus("connected");
				assertSpyCalls(onStatusChangeSpy, 2);
				assertSpyCall(onStatusChangeSpy, 1, {
					args: ["connected"],
				});

				preferencesManager.set("studioConnections.enableRemoteDiscovery", false);
				assertEquals(discoveryMethod.destructed, true);
				assertSpyCalls(onStatusChangeSpy, 3);
				assertSpyCall(onStatusChangeSpy, 2, {
					args: ["disconnected"],
				});

				preferencesManager.set("studioConnections.enableRemoteDiscovery", true);

				const discoveryMethod2 = assertLastWebRtcDiscoveryMethod(2);
				assertEquals(discoveryMethod2.endpoint, "wss://discovery.renda.studio/");

				discoveryMethod.setStatus("connected");
				assertSpyCalls(onStatusChangeSpy, 5);
				assertSpyCall(onStatusChangeSpy, 4, {
					args: ["connected"],
				});

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
			},
		});
	},
});
