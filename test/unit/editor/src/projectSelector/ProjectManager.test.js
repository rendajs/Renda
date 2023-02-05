import {injectMockEditorInstance} from "../../../../../editor/src/editorInstance.js";
import {MemoryEditorFileSystem} from "../../../../../editor/src/util/fileSystems/MemoryEditorFileSystem.js";
import {Importer} from "fake-imports";
import {assertSpyCall, spy, stub} from "std/testing/mock.ts";
import {waitForMicrotasks} from "../../../shared/waitForMicroTasks.js";

console.log(import.meta.url);
const importer = new Importer(import.meta.url);
importer.makeReal("../../../../../editor/src/editorInstance.js");
importer.fakeModule("../../../../../editor/src/windowManagement/contentWindows/ContentWindowConnections.js", "export const ContentWindowConnections = {}");
importer.fakeModule("../../../../../editor/src/network/editorConnections/EditorConnectionsManager.js", `
let lastEditorConnectionsManager;
export function getLastEditorConnectionsManager() {
	return lastEditorConnectionsManager;
}

export class EditorConnectionsManager {
	constructor() {
		lastEditorConnectionsManager = this;
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
importer.fakeModule("../../../../../editor/src/assets/ProjectAsset.js", "export const ProjectAsset = {}");
importer.fakeModule("../../../../../editor/src/assets/AssetManager.js", `export class AssetManager {
	assetSettingsLoaded = true;
	async waitForAssetSettingsLoad() {}
	async waitForAssetListsLoad() {}
}`);

/** @type {import("../../../../../editor/src/projectSelector/ProjectManager.js")} */
const ProjectManagerMod = await importer.import("../../../../../editor/src/projectSelector/ProjectManager.js");
const {ProjectManager} = ProjectManagerMod;

const EditorConnectionsManagerMod = await importer.import("../../../../../editor/src/network/editorConnections/EditorConnectionsManager.js");
/** @type {() => import("../../../../../editor/src/network/editorConnections/EditorConnectionsManager.js").EditorConnectionsManager} */
const getLastEditorConnectionsManager = EditorConnectionsManagerMod.getLastEditorConnectionsManager;

/**
 * @typedef ProjectManagerTestContext
 * @property {import("../../../../../editor/src/projectSelector/ProjectManager.js").ProjectManager} manager
 * @property {import("../../../../../editor/src/network/editorConnections/EditorConnectionsManager.js").EditorConnectionsManager} editorConnectionsManager
 */

/**
 * @param {Object} options
 * @param {(ctx: ProjectManagerTestContext) => Promise<void>} options.fn
 */
async function basicTest({fn}) {
	const oldDocument = globalThis.document;
	try {
		globalThis.document = /** @type {Document} */ (new EventTarget());

		const mockEditor = /** @type {import("../../../../../editor/src/Editor.js").Editor} */ ({
			windowManager: {
				onContentWindowPersistentDataFlushRequest(cb) {},
				removeOnContentWindowPersistentDataFlushRequest(cb) {},
				reloadCurrentWorkspace() {},
				setContentWindowPersistentData() {},
			},
		});
		injectMockEditorInstance(mockEditor);

		const manager = new ProjectManager();

		const editorConnectionsManager = getLastEditorConnectionsManager();

		await fn({manager, editorConnectionsManager});
	} finally {
		globalThis.document = oldDocument;
		injectMockEditorInstance(null);
	}
}

function createStoredProjectEntry() {
	/** @type {import("../../../../../editor/src/projectSelector/ProjectManager.js").StoredProjectEntryAny} */
	const entry = {
		fileSystemType: "db",
		projectUuid: "uuid",
		name: "name",
		isWorthSaving: true,
	};
	return entry;
}

Deno.test({
	name: "Opening a project updates the editor connections manager",
	async fn() {
		await basicTest({
			async fn({manager, editorConnectionsManager}) {
				const fs = new MemoryEditorFileSystem();
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

				const setDiscoveryEndpointSpy = spy(editorConnectionsManager, "setDiscoveryEndpoint");
				const setAllowInternalIncomingSpy = spy(editorConnectionsManager, "setAllowInternalIncoming");
				const sendSetIsEditorHostSpy = spy(editorConnectionsManager, "sendSetIsEditorHost");
				const setProjectMetaDataSpy = spy(editorConnectionsManager, "setProjectMetaData");

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
