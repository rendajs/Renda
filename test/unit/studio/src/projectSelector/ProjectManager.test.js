import {injectMockStudioInstance} from "../../../../../studio/src/studioInstance.js";
import {MemoryStudioFileSystem} from "../../../../../studio/src/util/fileSystems/MemoryStudioFileSystem.js";
import {Importer} from "fake-imports";
import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {waitForMicrotasks} from "../../../shared/waitForMicroTasks.js";
import {assertEquals, assertRejects, assertStrictEquals, assertThrows} from "std/testing/asserts.ts";
import {PreferencesManager} from "../../../../../studio/src/preferences/PreferencesManager.js";
import {assertPromiseResolved} from "../../../shared/asserts.js";
import {SingleInstancePromise} from "../../../../../src/mod.js";

const importer = new Importer(import.meta.url);
importer.makeReal("../../../../../studio/src/studioInstance.js");
importer.makeReal("../../../../../studio/src/preferences/preferencesLocation/FilePreferencesLocation.js");
importer.fakeModule("../../../../../studio/src/windowManagement/contentWindows/ContentWindowConnections.js", "export const ContentWindowConnections = {}");
importer.fakeModule("../../../../../studio/src/assets/ProjectAsset.js", "export const ProjectAsset = {}");
importer.fakeModule("../../../../../studio/src/assets/AssetManager.js", `
let waitForAssetListsLoadPromise = Promise.resolve();
let resolveAssetListsPromise = null;

export function forcePendingAssetListsPromise(pending) {
	if (pending) {
		if (!resolveAssetListsPromise) {
			waitForAssetListsLoadPromise = new Promise(resolve => {
				resolveAssetListsPromise = resolve;
			})
		}
	} else {
		if (resolveAssetListsPromise) {
			resolveAssetListsPromise();
			resolveAssetListsPromise = null;
		}
	}
}

export class AssetManager {
	assetSettingsLoaded = true;
	async waitForAssetSettingsLoad() {}
	waitForAssetListsLoad() {
		return waitForAssetListsLoadPromise;
	}
	destructor() {}
}`);
importer.fakeModule("../../../../../studio/src/util/fileSystems/RemoteStudioFileSystem.js", `
import {MemoryStudioFileSystem} from "./MemoryStudioFileSystem.js";
export class RemoteStudioFileSystem extends MemoryStudioFileSystem {
	setConnection(connection) {}
}
`);

/** @type {import("../../../../../studio/src/projectSelector/ProjectManager.js")} */
const ProjectManagerMod = await importer.import("../../../../../studio/src/projectSelector/ProjectManager.js");
const {ProjectManager} = ProjectManagerMod;

const AssetManagerMod = await importer.import("../../../../../studio/src/assets/AssetManager.js");
/** @type {(pending: boolean) => void} */
const forcePendingAssetListsPromise = AssetManagerMod.forcePendingAssetListsPromise;

/** @type {import("../../../../../studio/src/util/fileSystems/RemoteStudioFileSystem.js")} */
const RemoteStudioFileSystemMod = await importer.import("../../../../../studio/src/util/fileSystems/RemoteStudioFileSystem.js");
const {RemoteStudioFileSystem} = RemoteStudioFileSystemMod;

const PROJECT_PREFERENCES_PATH = [".renda", "sharedPreferences.json"];
const LOCAL_PROJECT_PREFERENCES_PATH = [".renda", "localPreferences.json"];
const GITIGNORE_PATH = [".gitignore"];

/**
 * @typedef ProjectManagerTestContext
 * @property {import("../../../../../studio/src/projectSelector/ProjectManager.js").ProjectManager} manager
 * @property {import("../../../../../studio/src/Studio.js").Studio} studio
 * @property {PreferencesManager<typeof mockPreferencesConfig>} mockPreferencesManager
 * @property {(data: import("../../../../../studio/src/windowManagement/WindowManager.js").ContentWindowPersistentDiskData[] | null) => Promise<void>} fireFlushRequestCallbacks
 */

const mockPreferencesConfig = /** @type {const} @satisfies {Object<string, import("../../../../../studio/src/preferences/PreferencesManager.js").PreferenceConfig>} */ ({
	strPref: {
		type: "string",
		default: "default",
	},
	"studioConnections.allowRemoteIncoming": {
		type: "boolean",
	},
	"studioConnections.enableInternalDiscovery": {
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
				focusOrCreateContentWindow(contentWindowConstructorOrId) {},
			},
			preferencesManager: /** @type {PreferencesManager<any>} */ (mockPreferencesManager),
			studioConnectionsManager: {
				async waitForConnection(config) {
					return {
						id: "connection id",
					};
				},
				requestConnection(otherClientUuid) {},
			},
		});
		injectMockStudioInstance(mockStudio);

		const manager = new ProjectManager();

		await fn({
			manager,
			studio: mockStudio,
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
		forcePendingAssetListsPromise(false);
	}
}

/**
 * @param {object} options
 * @param {boolean} [options.isWorthSaving]
 * @param {"db" | "remote"} [options.fileSystemType]
 */
function createStoredProjectEntry({
	isWorthSaving = true,
	fileSystemType = "db",
} = {}) {
	/** @type {import("../../../../../studio/src/projectSelector/ProjectManager.js").StoredProjectEntryAny} */
	const entry = {
		fileSystemType,
		projectUuid: "uuid",
		name: "name",
		isWorthSaving,
	};
	return entry;
}

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

Deno.test({
	name: "onProjectOpen is fired when a project is opened",
	async fn() {
		await basicTest({
			async fn({manager}) {
				const onOpenSpy = spy();
				manager.onProjectOpen(onOpenSpy);

				const fs1 = new MemoryStudioFileSystem();
				const entry1 = createStoredProjectEntry();
				await manager.openProject(fs1, entry1, true);

				assertSpyCalls(onOpenSpy, 1);

				const fs2 = new MemoryStudioFileSystem();
				const entry2 = createStoredProjectEntry();
				await manager.openProject(fs2, entry2, true);

				assertSpyCalls(onOpenSpy, 2);
			},
		});
	},
});

Deno.test({
	name: "waitForProjectOpen resolves once the currently loading project is open",
	async fn() {
		await basicTest({
			async fn({manager}) {
				const promise1 = manager.waitForProjectOpen();

				const fs1 = new MemoryStudioFileSystem();
				const entry1 = createStoredProjectEntry();
				await assertPromiseResolved(promise1, false);
				forcePendingAssetListsPromise(true);
				const openPromise1 = manager.openProject(fs1, entry1, true);

				await assertPromiseResolved(promise1, false);
				forcePendingAssetListsPromise(false);
				await openPromise1;
				await assertPromiseResolved(promise1, true);

				const promise2 = manager.waitForProjectOpen(true);
				await assertPromiseResolved(promise2, true);

				const promise3 = manager.waitForProjectOpen(false);

				const fs2 = new MemoryStudioFileSystem();
				const entry2 = createStoredProjectEntry();
				forcePendingAssetListsPromise(true);
				const openPromise2 = manager.openProject(fs2, entry2, true);

				await assertPromiseResolved(promise3, false);
				forcePendingAssetListsPromise(false);
				await openPromise2;
				await assertPromiseResolved(promise3, true);
			},
		});
	},
});

Deno.test({
	name: "fires onProjectOpenEntryChange",
	async fn() {
		await basicTest({
			async fn({manager}) {
				/** @type {(import("../../../../../studio/src/projectSelector/ProjectManager.js").StoredProjectEntryAny | null)[]} */
				const onEntryChangeCalls = [];
				manager.onProjectOpenEntryChange(entry => {
					onEntryChangeCalls.push(structuredClone(entry));
				});

				const fs = new MemoryStudioFileSystem();
				const entry = createStoredProjectEntry({isWorthSaving: false});
				await manager.openProject(fs, entry, true);

				assertEquals(onEntryChangeCalls.length, 1);
				assertEquals(onEntryChangeCalls[0], {
					fileSystemType: "db",
					isWorthSaving: false,
					name: "name",
					projectUuid: "uuid",
				});

				fs.setRootName("new root name");
				assertEquals(onEntryChangeCalls.length, 3);
				assertEquals(onEntryChangeCalls[1], {
					fileSystemType: "db",
					isWorthSaving: false,
					name: "new root name",
					projectUuid: "uuid",
				});
				assertEquals(onEntryChangeCalls[2], {
					fileSystemType: "db",
					isWorthSaving: true,
					name: "new root name",
					projectUuid: "uuid",
				});
			},
		});
	},
});

Deno.test({
	name: "onRootHasWritePermissionsChange is fired",
	async fn() {
		await basicTest({
			async fn({manager}) {
				const onChangeSpy = spy();
				manager.onRootHasWritePermissionsChange(onChangeSpy);

				let resolvePermission = () => {};
				/** @type {Promise<void>} */
				const permissionPromise = new Promise(resolve => {
					resolvePermission = resolve;
				});
				const fs1 = new MemoryStudioFileSystem();
				stub(fs1, "waitForPermission", () => {
					return permissionPromise;
				});
				const entry1 = createStoredProjectEntry();
				await manager.openProject(fs1, entry1, true);

				assertSpyCalls(onChangeSpy, 1);

				resolvePermission();
				await waitForMicrotasks();

				assertSpyCalls(onChangeSpy, 2);
			},
		});
	},
});

Deno.test({
	name: "Current project metadata is updated",
	async fn() {
		await basicTest({
			async fn({manager}) {
				assertEquals(manager.getCurrentProjectMetadata(), null);
				const fs1 = new MemoryStudioFileSystem();

				let resolvePermission = () => {};
				/** @type {Promise<void>} */
				const permissionPromise = new Promise(resolve => {
					resolvePermission = resolve;
				});
				stub(fs1, "waitForPermission", () => {
					return permissionPromise;
				});

				const entry1 = createStoredProjectEntry({isWorthSaving: false});
				await manager.openProject(fs1, entry1, true);

				assertEquals(manager.getCurrentProjectMetadata(), {
					fileSystemHasWritePermissions: false,
					name: "name",
					uuid: "uuid",
				});

				resolvePermission();
				await waitForMicrotasks();

				assertEquals(manager.getCurrentProjectMetadata(), {
					fileSystemHasWritePermissions: true,
					name: "name",
					uuid: "uuid",
				});

				const fs2 = new MemoryStudioFileSystem();
				const entry2 = createStoredProjectEntry();
				entry2.name = "name 2";
				entry2.projectUuid = "uuid 2";
				await manager.openProject(fs2, entry2, true);

				assertEquals(manager.getCurrentProjectMetadata(), {
					fileSystemHasWritePermissions: true,
					name: "name 2",
					uuid: "uuid 2",
				});
			},
		});
	},
});

Deno.test({
	name: "Open existing remote project",
	async fn() {
		await basicTest({
			async fn({manager, studio}) {
				/** @type {(connection: import("../../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnectionWithType) => void} */
				let resolveConnectionSpy = () => {};
				const waitForConnectionSpy = stub(studio.studioConnectionsManager, "waitForConnection", async config => {
					/** @type {Promise<import("../../../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnectionWithType>} */
					const promise = new Promise(r => {
						resolveConnectionSpy = r;
					});
					return promise;
				});
				const requestConnectionSpy = spy(studio.studioConnectionsManager, "requestConnection");

				forcePendingAssetListsPromise(true);

				const openPromise = manager.openExistingProject({
					fileSystemType: "remote",
					name: "Project",
					projectUuid: "uuid",
					remoteProjectUuid: "remote uuid",
					remoteProjectConnectionType: "renda:internal",
				}, false);

				await assertPromiseResolved(openPromise, false);

				resolveConnectionSpy({
					id: "connection id",
					clientType: "studio-host",
					connectionType: "renda:internal",
					projectMetadata: null,
				});

				await assertPromiseResolved(openPromise, false);

				assertSpyCalls(waitForConnectionSpy, 1);
				assertSpyCall(waitForConnectionSpy, 0, {
					args: [
						{
							connectionType: "renda:internal",
							projectUuid: "remote uuid",
						},
					],
				});

				assertSpyCalls(requestConnectionSpy, 1);
				assertSpyCall(requestConnectionSpy, 0, {
					args: ["connection id"],
				});

				assertEquals(manager.currentProjectIsRemote, true);

				forcePendingAssetListsPromise(false);

				await assertPromiseResolved(openPromise, true);
			},
		});
	},
});

Deno.test({
	name: "Throws when opening existing remote project with missing parameters",
	async fn() {
		await basicTest({
			async fn({manager, studio}) {
				await assertRejects(async () => {
					await manager.openExistingProject({
						fileSystemType: "remote",
						name: "Project",
						projectUuid: "uuid",
					}, false);
				}, Error, "Unable to open remote project. Remote project data is corrupt.");
			},
		});
	},
});

Deno.test({
	name: "Throws when opening existing project with unknown file system type",
	async fn() {
		await basicTest({
			async fn({manager}) {
				await assertRejects(async () => {
					await manager.openExistingProject({
						fileSystemType: /** @type {"db"} */ (/** @type {unknown} */ ("unknown")),
						name: "Project",
						projectUuid: "uuid",
					}, false);
				}, Error, 'Unknown file system type: "unknown".');
			},
		});
	},
});

Deno.test({
	name: "Opening remote project",
	async fn() {
		await basicTest({
			async fn({manager, studio}) {
				const focusOrCreateContentWindowSpy = spy(studio.windowManager, "focusOrCreateContentWindow");
				await manager.openNewRemoteProject(true);

				assertSpyCalls(focusOrCreateContentWindowSpy, 1);
				assertEquals(manager.currentProjectIsRemote, true);
				const metadata = manager.getCurrentProjectMetadata();
				assertEquals(metadata?.fileSystemHasWritePermissions, true);
				assertEquals(metadata?.name, "Remote Filesystem");
			},
		});
	},
});

Deno.test({
	name: "assignRemoteConnection throws when no project was opened yet",
	async fn() {
		await basicTest({
			async fn({manager}) {
				assertThrows(() => {
					const mockConnection = /** @type {import("../../../../../src/network/studioConnections/StudioConnection.js").StudioConnection<any, any>} */ ({});
					manager.assignRemoteConnection(mockConnection);
				}, Error, "Assertion failed: An active connection was made before a project entry was created.");
			},
		});
	},
});

Deno.test({
	name: "assignRemoteConnection throws when no project was opened yet",
	async fn() {
		await basicTest({
			async fn({manager}) {
				const fs = new MemoryStudioFileSystem();
				const entry = createStoredProjectEntry();
				await manager.openProject(fs, entry, true);
				assertThrows(() => {
					const mockConnection = /** @type {import("../../../../../src/network/studioConnections/StudioConnection.js").StudioConnection<any, any>} */ ({});
					manager.assignRemoteConnection(mockConnection);
				}, Error, "Assertion failed: Current file system is not a remote file system.");
			},
		});
	},
});

Deno.test({
	name: "assignRemoteConnection throws when connection has no metadata",
	async fn() {
		await basicTest({
			async fn({manager}) {
				const fs = new RemoteStudioFileSystem();
				const entry = createStoredProjectEntry({fileSystemType: "remote"});
				await manager.openProject(fs, entry, true);
				assertThrows(() => {
					const mockConnection = /** @type {import("../../../../../src/network/studioConnections/StudioConnection.js").StudioConnection<any, any>} */ ({});
					manager.assignRemoteConnection(mockConnection);
				}, Error, "Assertion failed: Connection does not have project metadata.");
			},
		});
	},
});

Deno.test({
	name: "assignRemoteConnection assigns the connection and changes current open event",
	async fn() {
		await basicTest({
			async fn({manager}) {
				const fs = new RemoteStudioFileSystem();
				const setConnectionSpy = spy(fs, "setConnection");
				const entry = createStoredProjectEntry({fileSystemType: "remote"});
				await manager.openProject(fs, entry, true);
				const mockConnection = /** @type {import("../../../../../src/network/studioConnections/StudioConnection.js").StudioConnection<any, any>} */ ({
					projectMetadata: {
						fileSystemHasWritePermissions: true,
						name: "Project name",
						uuid: "remote project uuid",
					},
					connectionType: "renda:internal",
				});
				/** @type {(import("../../../../../studio/src/projectSelector/ProjectManager.js").StoredProjectEntryAny | null)[]} */
				const onEntryChangeCalls = [];
				manager.onProjectOpenEntryChange(entry => {
					onEntryChangeCalls.push(entry);
				});

				manager.assignRemoteConnection(mockConnection);

				assertSpyCalls(setConnectionSpy, 1);
				assertStrictEquals(setConnectionSpy.calls[0].args[0], mockConnection);
				assertEquals(manager.currentProjectIsMarkedAsWorthSaving, true);

				assertEquals(onEntryChangeCalls, [
					{
						fileSystemType: "remote",
						isWorthSaving: true,
						name: "Project name",
						projectUuid: "uuid",
						remoteProjectConnectionType: "renda:internal",
						remoteProjectUuid: "remote project uuid",
					},
				]);
			},
		});
	},
});
