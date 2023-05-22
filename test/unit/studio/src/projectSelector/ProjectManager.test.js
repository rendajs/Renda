import {injectMockStudioInstance} from "../../../../../studio/src/studioInstance.js";
import {MemoryStudioFileSystem} from "../../../../../studio/src/util/fileSystems/MemoryStudioFileSystem.js";
import {Importer} from "fake-imports";
import {assertSpyCall, assertSpyCalls, spy, stub} from "std/testing/mock.ts";
import {waitForMicrotasks} from "../../../shared/waitForMicroTasks.js";
import {assertEquals} from "std/testing/asserts.ts";
import {PreferencesManager} from "../../../../../studio/src/preferences/PreferencesManager.js";

console.log(import.meta.url);
const importer = new Importer(import.meta.url);
importer.makeReal("../../../../../studio/src/studioInstance.js");
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

const LOCAL_PROJECT_SETTINGS_PATH = [".renda", "localProjectSettings.json"];
const PROJECT_PREFERENCES_PATH = [".renda", "preferences.json"];
const LOCAL_PROJECT_PREFERENCES_PATH = [".renda", "preferencesLocal.json"];
const GITIGNORE_PATH = [".gitignore"];

/**
 * @typedef ProjectManagerTestContext
 * @property {import("../../../../../studio/src/projectSelector/ProjectManager.js").ProjectManager} manager
 * @property {import("../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").StudioConnectionsManager} studioConnectionsManager
 * @property {import("../../../../../studio/src/Studio.js").Studio} studio
 * @property {PreferencesManager<{strPref: {type: "string", default: "default"}}>} mockPreferencesManager
 * @property {(data: unknown) => Promise<void>} fireFlushRequestCallbacks
 */

/**
 * @param {object} options
 * @param {(ctx: ProjectManagerTestContext) => Promise<void>} options.fn
 */
async function basicTest({fn}) {
	const oldDocument = globalThis.document;
	try {
		globalThis.document = /** @type {Document} */ (new EventTarget());

		/** @type {Set<(data: unknown) => Promise<void>>} */
		const flushRequestCallbacks = new Set();

		const mockPreferencesManager = new PreferencesManager({
			strPref: {
				type: "string",
				default: "default",
			},
		});

		const mockStudio = /** @type {import("../../../../../studio/src/Studio.js").Studio} */ ({
			windowManager: {
				onContentWindowPersistentDataFlushRequest(cb) {},
				removeOnContentWindowPersistentDataFlushRequest(cb) {},
				reloadCurrentWorkspace() {},
				setContentWindowPersistentData() {},
				onContentWindowPreferencesFlushRequest(cb) {
					flushRequestCallbacks.add(cb);
				},
				removeOnContentWindowPreferencesFlushRequest(cb) {
					flushRequestCallbacks.delete(cb);
				},
				setContentWindowPreferences() {},
			},
			preferencesManager: /** @type {PreferencesManager<any>} */ (mockPreferencesManager),
		});
		injectMockStudioInstance(mockStudio);

		const manager = new ProjectManager();

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
	name: "Opening a project updates the studio connections manager",
	async fn() {
		await basicTest({
			async fn({manager, studioConnectionsManager}) {
				const fs = new MemoryStudioFileSystem();
				let resolveWaitForPermission = () => {};
				stub(fs, "waitForPermission", () => {
					return new Promise(resolve => {
						resolveWaitForPermission = resolve;
					});
				});
				fs.writeJson(LOCAL_PROJECT_SETTINGS_PATH, {
					"studioConnections.allowInternalIncoming": true,
					"studioConnections.allowRemoteIncoming": true,
				});
				const entry = createStoredProjectEntry();

				const setDiscoveryEndpointSpy = spy(studioConnectionsManager, "setDiscoveryEndpoint");
				const setAllowInternalIncomingSpy = spy(studioConnectionsManager, "setAllowInternalIncoming");
				const sendSetIsStudioHostSpy = spy(studioConnectionsManager, "sendSetIsStudioHost");
				const setProjectMetaDataSpy = spy(studioConnectionsManager, "setProjectMetaData");

				await manager.openProject(fs, entry, true);

				assertSpyCall(setDiscoveryEndpointSpy, setDiscoveryEndpointSpy.calls.length - 1, {
					args: [null],
				});
				assertSpyCall(setAllowInternalIncomingSpy, setAllowInternalIncomingSpy.call.length - 1, {
					args: [false],
				});
				assertSpyCall(sendSetIsStudioHostSpy, sendSetIsStudioHostSpy.calls.length - 1, {
					args: [true],
				});
				assertSpyCall(setProjectMetaDataSpy, setProjectMetaDataSpy.calls.length - 1, {
					args: [
						{
							name: "name",
							uuid: "uuid",
							fileSystemHasWritePermissions: false,
						},
					],
				});

				resolveWaitForPermission();
				await waitForMicrotasks();

				assertSpyCall(setDiscoveryEndpointSpy, setDiscoveryEndpointSpy.calls.length - 1, {
					args: ["ws://localhost/defaultEndpoint"],
				});
				assertSpyCall(setAllowInternalIncomingSpy, setAllowInternalIncomingSpy.calls.length - 1, {
					args: [true],
				});
				assertSpyCall(sendSetIsStudioHostSpy, sendSetIsStudioHostSpy.calls.length - 1, {
					args: [true],
				});
				assertSpyCall(setProjectMetaDataSpy, setProjectMetaDataSpy.calls.length - 1, {
					args: [
						{
							name: "name",
							uuid: "uuid",
							fileSystemHasWritePermissions: true,
						},
					],
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
				fs.writeJson(LOCAL_PROJECT_SETTINGS_PATH, {
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
				assertEquals(await fs.readJson(LOCAL_PROJECT_SETTINGS_PATH), {
					contentWindowPreferences: [
						{
							id: "uuid",
							type: "type",
							data: {foo2: "bar2"},
						},
					],
				});

				await fireFlushRequestCallbacks(null);
				assertEquals(await fs.exists(LOCAL_PROJECT_SETTINGS_PATH), false);
			},
		});
	},
});

Deno.test({
	name: "Flush requests are not written while loading a workspace",
	async fn() {
		await basicTest({
			async fn({manager, studio, fireFlushRequestCallbacks}) {
				stub(studio.windowManager, "reloadCurrentWorkspace", async () => {
					await fireFlushRequestCallbacks({
						label: "this data should not be written",
					});
				});

				const fs = new MemoryStudioFileSystem();
				fs.writeJson(LOCAL_PROJECT_SETTINGS_PATH, {
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

				assertEquals(await fs.readJson(LOCAL_PROJECT_SETTINGS_PATH), {
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

				assertEquals(await fs.readJson(LOCAL_PROJECT_SETTINGS_PATH), {
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
				assertEquals(mockPreferencesManager.get("strPref"), "default");
				assertEquals(await fs.exists(PROJECT_PREFERENCES_PATH), false);
				assertEquals(await fs.exists(LOCAL_PROJECT_PREFERENCES_PATH), false);
				assertEquals(await fs.exists(GITIGNORE_PATH), false);

				mockPreferencesManager.set("strPref", "project", {location: "project"});
				mockPreferencesManager.set("strPref", "versionControl", {location: "version-control"});

				// Wait for flush
				await waitForMicrotasks();

				assertEquals(await fs.readJson(PROJECT_PREFERENCES_PATH), {
					strPref: "versionControl",
				});
				assertEquals(await fs.readJson(LOCAL_PROJECT_PREFERENCES_PATH), {
					strPref: "project",
				});
				assertEquals(await fs.readText(GITIGNORE_PATH), ".renda/preferencesLocal.json");
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
