import {injectMockStudioInstance} from "../../../../../studio/src/studioInstance.js";
import {MemoryStudioFileSystem} from "../../../../../studio/src/util/fileSystems/MemoryStudioFileSystem.js";
import {Importer} from "fake-imports";
import {assertSpyCall, spy, stub} from "std/testing/mock.ts";
import {waitForMicrotasks} from "../../../shared/waitForMicroTasks.js";

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
	sendSetIsEditorHost() {}
	setProjectMetaData() {}
}
`);
importer.fakeModule("../../../../../studio/src/assets/ProjectAsset.js", "export const ProjectAsset = {}");
importer.fakeModule("../../../../../studio/src/assets/AssetManager.js", `export class AssetManager {
	assetSettingsLoaded = true;
	async waitForAssetSettingsLoad() {}
	async waitForAssetListsLoad() {}
}`);

/** @type {import("../../../../../studio/src/projectSelector/ProjectManager.js")} */
const ProjectManagerMod = await importer.import("../../../../../studio/src/projectSelector/ProjectManager.js");
const {ProjectManager} = ProjectManagerMod;

const StudiorConnectionsManagerMod = await importer.import("../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js");
/** @type {() => import("../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").StudioConnectionsManager} */
const getLastStudioConnectionsManager = StudiorConnectionsManagerMod.getLastStudioConnectionsManager;

/**
 * @typedef ProjectManagerTestContext
 * @property {import("../../../../../studio/src/projectSelector/ProjectManager.js").ProjectManager} manager
 * @property {import("../../../../../studio/src/network/studioConnections/StudioConnectionsManager.js").StudioConnectionsManager} studioConnectionsManager
 */

/**
 * @param {object} options
 * @param {(ctx: ProjectManagerTestContext) => Promise<void>} options.fn
 */
async function basicTest({fn}) {
	const oldDocument = globalThis.document;
	try {
		globalThis.document = /** @type {Document} */ (new EventTarget());

		const mockEditor = /** @type {import("../../../../../studio/src/Studio.js").Studio} */ ({
			windowManager: {
				onContentWindowPersistentDataFlushRequest(cb) {},
				removeOnContentWindowPersistentDataFlushRequest(cb) {},
				reloadCurrentWorkspace() {},
				setContentWindowPersistentData() {},
			},
		});
		injectMockStudioInstance(mockEditor);

		const manager = new ProjectManager();

		const studioConnectionsManager = getLastStudioConnectionsManager();

		await fn({manager, studioConnectionsManager});
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
				fs.writeJson(["ProjectSettings", "localProjectSettings.json"], {
					editorConnectionsAllowInternalIncoming: true,
					editorConnectionsAllowRemoteIncoming: true,
				});
				const entry = createStoredProjectEntry();

				const setDiscoveryEndpointSpy = spy(studioConnectionsManager, "setDiscoveryEndpoint");
				const setAllowInternalIncomingSpy = spy(studioConnectionsManager, "setAllowInternalIncoming");
				const sendSetIsEditorHostSpy = spy(studioConnectionsManager, "sendSetIsEditorHost");
				const setProjectMetaDataSpy = spy(studioConnectionsManager, "setProjectMetaData");

				await manager.openProject(fs, entry, true);

				assertSpyCall(setDiscoveryEndpointSpy, setDiscoveryEndpointSpy.calls.length - 1, {
					args: [null],
				});
				assertSpyCall(setAllowInternalIncomingSpy, setAllowInternalIncomingSpy.call.length - 1, {
					args: [false],
				});
				assertSpyCall(sendSetIsEditorHostSpy, sendSetIsEditorHostSpy.calls.length - 1, {
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
				assertSpyCall(sendSetIsEditorHostSpy, sendSetIsEditorHostSpy.calls.length - 1, {
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
