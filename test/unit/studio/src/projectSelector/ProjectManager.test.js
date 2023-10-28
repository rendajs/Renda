import {injectMockStudioInstance} from "../../../../../studio/src/studioInstance.js";
import {MemoryStudioFileSystem} from "../../../../../studio/src/util/fileSystems/MemoryStudioFileSystem.js";
import {Importer} from "fake-imports";
import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {waitForMicrotasks} from "../../../shared/waitForMicroTasks.js";
import {assertEquals, assertStrictEquals} from "std/testing/asserts.ts";
import {PreferencesManager} from "../../../../../studio/src/preferences/PreferencesManager.js";
import {assertPromiseResolved} from "../../../shared/asserts.js";
import {SingleInstancePromise} from "../../../../../src/mod.js";

console.log(import.meta.url);
const importer = new Importer(import.meta.url);
importer.makeReal("../../../../../studio/src/studioInstance.js");
importer.makeReal("../../../../../studio/src/preferences/preferencesLocation/FilePreferencesLocation.js");
importer.fakeModule("../../../../../studio/src/windowManagement/contentWindows/ContentWindowConnections.js", "export const ContentWindowConnections = {}");
importer.fakeModule("../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js", `
let lastStudioConnectionsManager;
export function getLastStudioConnectionsManager() {
	return lastStudioConnectionsManager;
}

export class StudioConnectionsManager {
	constructor() {
		lastStudioConnectionsManager = this;
	}
	getDefaultEndPoint() {
		return "ws://localhost/defaultEndpoint";
	}
	onActiveConnectionsChanged() {}
	setDiscoveryEndpoint() {}
	setAllowInternalIncoming() {}
	sendSetIsStudioHost() {}
	setProjectMetaData() {}
}
`);
importer.fakeModule("../../../../../studio/src/assets/ProjectAsset.js", "export const ProjectAsset = {}");
importer.fakeModule("../../../../../studio/src/assets/AssetManager.js", `export class AssetManager {
	assetSettingsLoaded = true;
	async waitForAssetSettingsLoad() {}
	async waitForAssetListsLoad() {}
	destructor() {}
}`);

/** @type {import("../../../../../studio/src/projectSelector/ProjectManager.js")} */
const ProjectManagerMod = await importer.import("../../../../../studio/src/projectSelector/ProjectManager.js");
const {ProjectManager} = ProjectManagerMod;

const StudiorConnectionsManagerMod = await importer.import("../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js");
/** @type {() => import("../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").StudioConnectionsManager} */
const getLastStudioConnectionsManager = StudiorConnectionsManagerMod.getLastStudioConnectionsManager;

const PROJECT_PREFERENCES_PATH = [".renda", "sharedPreferences.json"];
const LOCAL_PROJECT_PREFERENCES_PATH = [".renda", "localPreferences.json"];
const GITIGNORE_PATH = [".gitignore"];

/**
 * @typedef ProjectManagerTestContext
 * @property {import("../../../../../studio/src/projectSelector/ProjectManager.js").ProjectManager} manager
 * @property {import("../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").StudioConnectionsManager} studioConnectionsManager
 * @property {import("../../../../../studio/src/Studio.js").Studio} studio
 * @property {PreferencesManager<typeof mockPreferencesConfig>} mockPreferencesManager
 * @property {(data: import("../../../../../studio/src/windowManagement/WindowManager.js").ContentWindowPersistentDiskData[] | null) => Promise<void>} fireFlushRequestCallbacks
 */

const mockPreferencesConfig = /** @type {const} @satisfies {Object<string, import("../../../../../studio/src/preferences/PreferencesManager.js").PreferenceConfig>} */ ({

	strPref: {
		type: "string",
		default: "default",
	},
	"studioConnections.allowInternalIncoming": {
		type: "boolean",
	},
	"studioConnections.allowRemoteIncoming": {
		type: "boolean",
	},
});

/**
 * @param {object} options
 * @param {(ctx: ProjectManagerTestContext) => Promise<void>} options.fn
 */
async function basicTest({fn}) {
	const oldDocument = globalThis.document;
	try {
		globalThis.document = /** @type {Document} */ (new EventTarget());

		/** @type {Set<import("../../../../../studio/src/windowManagement/WindowManager.js").OnPreferencesFlushRequestCallback>} */
		const flushRequestCallbacks = new Set();

		const mockPreferencesManager = /** @type {PreferencesManager<any>} */ (new PreferencesManager(mockPreferencesConfig));

		const mockStudio = /** @type {import("../../../../../studio/src/Studio.js").Studio} */ ({
			windowManager: {
				onContentWindowPreferencesFlushRequest(cb) {
					flushRequestCallbacks.add(cb);
				},
				removeOnContentWindowPreferencesFlushRequest(cb) {
					flushRequestCallbacks.delete(cb);
				},
				setContentWindowPreferences() {},
				reloadWorkspaceInstance: new SingleInstancePromise(() => {}),
			},
			preferencesManager: /** @type {PreferencesManager<any>} */ (mockPreferencesManager),
		});
		injectMockStudioInstance(mockStudio);

		const manager = new ProjectManager(mockPreferencesManager);

		const studioConnectionsManager = getLastStudioConnectionsManager();

		await fn({
			manager,
			studioConnectionsManager, studio: mockStudio,
			mockPreferencesManager,
			async fireFlushRequestCallbacks(data) {
				const promises = [];
				for (const cb of flushRequestCallbacks) {
					promises.push(cb(data));
				}
				await Promise.all(promises);
			},
		});
	} finally {
		globalThis.document = oldDocument;
		injectMockStudioInstance(null);
	}
}

function createStoredProjectEntry() {
	/** @type {import("../../../../../studio/src/projectSelector/ProjectManager.js").StoredProjectEntryAny} */
	const entry = {
		fileSystemType: "db",
		projectUuid: "uuid",
		name: "name",
		isWorthSaving: true,
	};
	return entry;
}

Deno.test({
	name: "Studio connections manager is updated when needed",
	async fn() {
		await basicTest({
			async fn({manager, mockPreferencesManager, studioConnectionsManager}) {
				const fs = new MemoryStudioFileSystem();
				let resolveWaitForPermission = () => {};
				/** @type {Promise<void>} */
				const waitForPermissionPromise = new Promise(resolve => {
					resolveWaitForPermission = resolve;
				});
				stub(fs, "waitForPermission", () => {
					return waitForPermissionPromise;
				});
				fs.writeJson(LOCAL_PROJECT_PREFERENCES_PATH, {
					preferences: {
						"studioConnections.allowInternalIncoming": true,
						"studioConnections.allowRemoteIncoming": true,
					},
				});
				const entry = createStoredProjectEntry();

				const setDiscoveryEndpointSpy = spy(studioConnectionsManager, "setDiscoveryEndpoint");
				const setAllowInternalIncomingSpy = spy(studioConnectionsManager, "setAllowInternalIncoming");
				const sendSetIsStudioHostSpy = spy(studioConnectionsManager, "sendSetIsStudioHost");
				const setProjectMetaDataSpy = spy(studioConnectionsManager, "setProjectMetaData");

				/**
				 * @param {string?} endpoint
				 * @param {boolean} allowInternalIncoming
				 * @param {boolean} isStudioHost
				 * @param {import("../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").RemoteStudioMetaData} projectMetaData
				 */
				function testUpdateCall(endpoint, allowInternalIncoming, isStudioHost, projectMetaData) {
					assertSpyCall(setDiscoveryEndpointSpy, setDiscoveryEndpointSpy.calls.length - 1, {
						args: [endpoint],
					});
					assertSpyCall(setAllowInternalIncomingSpy, setAllowInternalIncomingSpy.calls.length - 1, {
						args: [allowInternalIncoming],
					});
					assertSpyCall(sendSetIsStudioHostSpy, sendSetIsStudioHostSpy.calls.length - 1, {
						args: [isStudioHost],
					});
					assertSpyCall(setProjectMetaDataSpy, setProjectMetaDataSpy.calls.length - 1, {
						args: [projectMetaData],
					});
				}

				const openProjectPromise = manager.openProject(fs, entry, false);

				testUpdateCall(null, false, true, {
					name: "name",
					uuid: "uuid",
					fileSystemHasWritePermissions: false,
				});

				resolveWaitForPermission();
				await waitForMicrotasks();
				await openProjectPromise;

				testUpdateCall("ws://localhost/defaultEndpoint", true, true, {
					name: "name",
					uuid: "uuid",
					fileSystemHasWritePermissions: true,
				});

				mockPreferencesManager.set("studioConnections.allowInternalIncoming", false, {location: "project"});
				testUpdateCall("ws://localhost/defaultEndpoint", false, true, {
					name: "name",
					uuid: "uuid",
					fileSystemHasWritePermissions: true,
				});

				mockPreferencesManager.set("studioConnections.allowRemoteIncoming", false, {location: "project"});
				testUpdateCall(null, false, true, {
					name: "name",
					uuid: "uuid",
					fileSystemHasWritePermissions: true,
				});

				manager.setStudioConnectionsDiscoveryEndpoint("endpoint");
				mockPreferencesManager.set("studioConnections.allowRemoteIncoming", true, {location: "project"});
				testUpdateCall("wss://endpoint", false, true, {
					name: "name",
					uuid: "uuid",
					fileSystemHasWritePermissions: true,
				});
			},
		});
	},
});

Deno.test({
	name: "content window preferences are loaded and saved",
	async fn() {
		await basicTest({
			async fn({manager, studio, fireFlushRequestCallbacks}) {
				const fs = new MemoryStudioFileSystem();
				fs.writeJson(LOCAL_PROJECT_PREFERENCES_PATH, {
					contentWindowPreferences: [
						{
							id: "uuid",
							type: "type",
							data: {foo: "bar"},
						},
					],
				});
				const entry = createStoredProjectEntry();

				const setContentWindowPreferencesSpy = spy(studio.windowManager, "setContentWindowPreferences");

				await manager.openProject(fs, entry, true);

				assertSpyCalls(setContentWindowPreferencesSpy, 1);
				assertSpyCall(setContentWindowPreferencesSpy, 0, {
					args: [
						[
							{
								id: "uuid",
								type: "type",
								data: {
									foo: "bar",
								},
							},
						],
					],
				});

				await fireFlushRequestCallbacks([
					{
						id: "uuid",
						type: "type",
						data: {foo2: "bar2"},
					},
				]);
				assertEquals(await fs.readJson(LOCAL_PROJECT_PREFERENCES_PATH), {
					contentWindowPreferences: [
						{
							id: "uuid",
							type: "type",
							data: {foo2: "bar2"},
						},
					],
				});

				await fireFlushRequestCallbacks(null);
				assertEquals(await fs.readJson(LOCAL_PROJECT_PREFERENCES_PATH), {
				});
			},
		});
	},
});

Deno.test({
	name: "Flush requests are not written while loading a workspace",
	async fn() {
		await basicTest({
			async fn({manager, studio, fireFlushRequestCallbacks}) {
				studio.windowManager.reloadWorkspaceInstance = new SingleInstancePromise(async () => {
					await fireFlushRequestCallbacks([
						{
							id: "id",
							type: "type",
							data: {
								label: "this data should not be written",
							},
						},
					]);
				});

				const fs = new MemoryStudioFileSystem();
				fs.writeJson(LOCAL_PROJECT_PREFERENCES_PATH, {
					contentWindowPreferences: [
						{
							id: "uuid",
							type: "type",
							data: {foo: "bar"},
						},
					],
				});
				const entry = createStoredProjectEntry();

				await manager.openProject(fs, entry, true);

				assertEquals(await fs.readJson(LOCAL_PROJECT_PREFERENCES_PATH), {
					contentWindowPreferences: [
						{
							id: "uuid",
							type: "type",
							data: {foo: "bar"},
						},
					],
				});

				// Run it a second time to ensure the previous callback gets unregistered
				await manager.openProject(fs, entry, true);

				assertEquals(await fs.readJson(LOCAL_PROJECT_PREFERENCES_PATH), {
					contentWindowPreferences: [
						{
							id: "uuid",
							type: "type",
							data: {foo: "bar"},
						},
					],
				});
			},
		});
	},
});

Deno.test({
	name: "Creates preference locations for project and version-control",
	async fn() {
		await basicTest({
			async fn({manager, mockPreferencesManager}) {
				const fs = new MemoryStudioFileSystem();
				const entry = createStoredProjectEntry();

				await manager.openProject(fs, entry, true);
				assertEquals(await fs.exists(PROJECT_PREFERENCES_PATH), false);
				assertEquals(await fs.exists(LOCAL_PROJECT_PREFERENCES_PATH), false);
				assertEquals(await fs.exists(GITIGNORE_PATH), false);

				mockPreferencesManager.set("strPref", "project", {location: "project"});
				mockPreferencesManager.set("strPref", "versionControl", {location: "version-control"});

				// Wait for flush
				await waitForMicrotasks();

				assertEquals(await fs.readJson(PROJECT_PREFERENCES_PATH), {
					preferences: {
						strPref: "versionControl",
					},
				});
				assertEquals(await fs.readJson(LOCAL_PROJECT_PREFERENCES_PATH), {
					preferences: {
						strPref: "project",
					},
				});
				assertEquals(await fs.readText(GITIGNORE_PATH), ".renda/localPreferences.json");
			},
		});
	},
});

Deno.test({
	name: "Removes preference locations when project is closed",
	async fn() {
		await basicTest({
			async fn({manager, mockPreferencesManager}) {
				const fs = new MemoryStudioFileSystem();
				const entry1 = createStoredProjectEntry();
				const removeLocationSpy = spy(mockPreferencesManager, "removeLocation");

				await manager.openProject(fs, entry1, true);
				assertSpyCalls(removeLocationSpy, 0);

				const entry2 = createStoredProjectEntry();
				entry2.projectUuid = "uuid2";
				await manager.openProject(fs, entry2, true);

				assertSpyCalls(removeLocationSpy, 2);
			},
		});
	},
});

Deno.test({
	name: "onAssetManagerChange fires when the asset manager changes",
	async fn() {
		await basicTest({
			async fn({manager}) {
				/** @type {import("../../../../../studio/src/projectSelector/ProjectManager.js").OnAssetManagerChangeCallback} */
				const onChangeFn = assetManager => {};
				const onChangeSpy = spy(onChangeFn);

				manager.onAssetManagerChange(onChangeSpy);

				const fs1 = new MemoryStudioFileSystem();
				const entry1 = createStoredProjectEntry();
				await manager.openProject(fs1, entry1, true);

				assertSpyCalls(onChangeSpy, 1);
				assertStrictEquals(onChangeSpy.calls[0].args[0], manager.assetManager);

				const fs2 = new MemoryStudioFileSystem();
				const entry2 = createStoredProjectEntry();
				await manager.openProject(fs2, entry2, true);

				assertSpyCalls(onChangeSpy, 2);
				assertStrictEquals(onChangeSpy.calls[1].args[0], manager.assetManager);

				manager.removeOnAssetManagerChange(onChangeSpy);

				const fs3 = new MemoryStudioFileSystem();
				const entry3 = createStoredProjectEntry();
				await manager.openProject(fs3, entry3, true);

				assertSpyCalls(onChangeSpy, 2);
			},
		});
	},
});

Deno.test({
	name: "getAssetManager resolves once the asset manager loads",
	async fn() {
		await basicTest({
			async fn({manager}) {
				const promise1 = manager.getAssetManager();
				await assertPromiseResolved(promise1, false);

				const fs1 = new MemoryStudioFileSystem();
				const entry1 = createStoredProjectEntry();
				await manager.openProject(fs1, entry1, true);

				await assertPromiseResolved(promise1, true);
				const result1 = await promise1;
				assertStrictEquals(result1, manager.assetManager);

				const promise2 = manager.getAssetManager();
				await assertPromiseResolved(promise2, true);
				const result2 = await promise2;
				assertStrictEquals(result2, manager.assetManager);
			},
		});
	},
});
