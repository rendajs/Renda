import {getEditorInstanceCertain} from "../editorInstance.js";
import {EditorFileSystemFsa} from "../Util/FileSystems/EditorFileSystemFsa.js";
import {EditorFileSystemIndexedDb} from "../Util/FileSystems/EditorFileSystemIndexedDb.js";
import {EditorFileSystemRemote} from "../Util/FileSystems/EditorFileSystemRemote.js";
import {AssetManager} from "../assets/AssetManager.js";
import {EditorConnectionsManager} from "../Network/EditorConnections/EditorConnectionsManager.js";
import {generateUuid} from "../../../src/util/mod.js";
import {GitIgnoreManager} from "./GitIgnoreManager.js";
import {ProjectSettingsManager} from "./ProjectSettingsManager.js";
import {EditorConnection} from "../Network/EditorConnections/EditorConnection.js";
import {SingleInstancePromise} from "../../../src/util/SingleInstancePromise.js";
import {ContentWindowConnections} from "../windowManagement/contentWindows/ContentWindowConnections.js";

/**
 * @typedef {Object} StoredProjectEntry
 * @property {"db" | "fsa" | "remote"} fileSystemType
 * @property {string} name
 * @property {import("../../../src/util/mod.js").UuidString} projectUuid
 * @property {boolean} isWorthSaving
 * @property {string} [alias = ""]
 * @property {FileSystemDirectoryHandle} [fileSystemHandle]
 * @property {import("../../../src/util/mod.js").UuidString} [remoteProjectUuid]
 * @property {import("../Network/EditorConnections/EditorConnectionsManager.js").MessageHandlerType} [remoteProjectConnectionType]
 */

export class ProjectManager {
	#boundOnFileSystemExternalChange;
	#boundOnFileSystemBeforeAnyChange;
	#boundOnFileSystemRootNameChange;

	#boundSaveContentWindowPersistentData;

	constructor() {
		/** @type {?import("../Util/FileSystems/EditorFileSystem.js").EditorFileSystem} */
		this.currentProjectFileSystem = null;
		this.currentProjectOpenEvent = null;
		this.currentProjectIsMarkedAsWorthSaving = false;
		this.currentProjectIsRemote = false;
		this.gitIgnoreManager = null;
		/**
		 * Used for settings that are generally expected to be stored in the project's repository.
		 * @type {ProjectSettingsManager?}
		 */
		this.projectSettings = null;
		/**
		 * Used for settings that are generally supposed to stay on the user's machine,
		 * rather than get saved in the project repository.
		 * @type {ProjectSettingsManager?}
		 */
		this.localProjectSettings = null;
		/** @type {AssetManager?} */
		this.assetManager = null;

		this.editorConnectionsAllowRemoteIncoming = false;
		this.editorConnectionsAllowInternalIncoming = false;
		this.editorConnectionsDiscoveryEndpoint = null;
		this.editorConnectionsManager = new EditorConnectionsManager();
		this.editorConnectionsManager.onActiveConnectionsChanged(activeConnections => {
			let pickedAvailableConnection = null;
			let pickedConnection = null;
			for (const [id, connection] of activeConnections) {
				if (connection.connectionState == "connected" && connection instanceof EditorConnection) {
					const availableConnection = this.editorConnectionsManager.availableConnections.get(id);
					pickedAvailableConnection = availableConnection;
					pickedConnection = connection;
					break;
				}
			}
			if (pickedConnection && pickedAvailableConnection && pickedAvailableConnection.projectMetaData) {
				const mataData = pickedAvailableConnection.projectMetaData;
				if (!this.currentProjectOpenEvent) {
					throw new Error("An active connection was made before a project entry was created.");
				}
				this.currentProjectOpenEvent.name = mataData.name;
				this.currentProjectOpenEvent.fileSystemType = "remote";
				this.currentProjectOpenEvent.remoteProjectUuid = mataData.uuid;
				this.currentProjectOpenEvent.remoteProjectConnectionType = pickedAvailableConnection.messageHandlerType;
				const fileSystem = /** @type {EditorFileSystemRemote} */ (this.currentProjectFileSystem);
				fileSystem.setConnection(pickedConnection);
				this.markCurrentProjectAsWorthSaving();
			}
		});

		/** @type {(e: import("../Util/FileSystems/EditorFileSystem.js").FileSystemExternalChangeEvent) => void} */
		this.#boundOnFileSystemExternalChange = e => {
			for (const cb of this.onExternalChangeCbs) {
				cb(e);
			}
		};
		this.#boundOnFileSystemBeforeAnyChange = () => {
			this.markCurrentProjectAsWorthSaving();
		};
		/** @type {(newName: string) => void} */
		this.#boundOnFileSystemRootNameChange = newName => {
			if (!this.currentProjectOpenEvent) {
				throw new Error("Cannot change the name of a remote project before it has been created.");
			}
			this.currentProjectOpenEvent.name = newName;
			this.fireOnProjectOpenEntryChangeCbs();
		};

		/** @type {(data: any) => Promise<void>} */
		this.#boundSaveContentWindowPersistentData = async data => {
			if (!this.localProjectSettings) return;
			this.localProjectSettings.set("contentWindowPersistentData", data);
		};

		/** @type {Set<function(StoredProjectEntry):void>} */
		this.onProjectOpenEntryChangeCbs = new Set();

		/** @type {Set<Function>} */
		this.onProjectOpenCbs = new Set();
		this.hasOpeneProject = false;

		/** @type {Set<import("../Util/FileSystems/EditorFileSystem.js").FileSystemExternalChangeCallback>} */
		this.onExternalChangeCbs = new Set();
		window.addEventListener("focus", () => this.suggestCheckExternalChanges());
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "visible") {
				this.suggestCheckExternalChanges();
			}
		});

		this.onAssetManagerLoadCbs = new Set();

		this.loadEditorConnectionsAllowIncomingInstance = new SingleInstancePromise(async () => {
			await this.loadEditorConnectionsAllowIncoming();
		}, {
			once: false,
		});
	}

	/**
	 * @param {import("../Util/FileSystems/EditorFileSystem.js").EditorFileSystem} fileSystem
	 * @param {StoredProjectEntry} openProjectChangeEvent
	 * @param {boolean} fromUserGesture
	 */
	async openProject(fileSystem, openProjectChangeEvent, fromUserGesture = false) {
		// todo: handle multiple calls to openProject by cancelling any current running calls.
		if (this.currentProjectFileSystem) {
			this.currentProjectFileSystem.removeOnExternalChange(this.#boundOnFileSystemExternalChange);
			this.currentProjectFileSystem.removeOnBeforeAnyChange(this.#boundOnFileSystemBeforeAnyChange);
			this.currentProjectFileSystem.removeOnRootNameChange(this.#boundOnFileSystemRootNameChange);
		}
		this.currentProjectFileSystem = fileSystem;
		this.currentProjectIsRemote = fileSystem instanceof EditorFileSystemRemote;
		this.currentProjectOpenEvent = openProjectChangeEvent;
		this.currentProjectIsMarkedAsWorthSaving = false;

		const gitIgnoreManager = new GitIgnoreManager(fileSystem);
		this.gitIgnoreManager = gitIgnoreManager;
		this.projectSettings = new ProjectSettingsManager(fileSystem, ["ProjectSettings", "projectSettings.json"], fromUserGesture);
		const localSettingsPath = ["ProjectSettings", "localProjectSettings.json"];
		this.localProjectSettings = new ProjectSettingsManager(fileSystem, localSettingsPath, fromUserGesture);
		this.localProjectSettings.onFileCreated(() => {
			gitIgnoreManager.addEntry(localSettingsPath);
		});

		this.loadEditorConnectionsAllowIncomingInstance.run();

		fileSystem.onExternalChange(this.#boundOnFileSystemExternalChange);
		fileSystem.onBeforeAnyChange(this.#boundOnFileSystemBeforeAnyChange);
		fileSystem.onRootNameChange(this.#boundOnFileSystemRootNameChange);
		if (openProjectChangeEvent.fileSystemType == "db" && !this.currentProjectIsMarkedAsWorthSaving) {
			this.fireOnProjectOpenEntryChangeCbs();
		}
		this.removeAssetManager();
		const editor = getEditorInstanceCertain();
		editor.windowManager.removeOnContentWindowPersistentDataFlushRequest(this.#boundSaveContentWindowPersistentData);
		await editor.windowManager.reloadCurrentWorkspace();
		editor.windowManager.onContentWindowPersistentDataFlushRequest(this.#boundSaveContentWindowPersistentData);

		const contentWindowPersistentData = await this.localProjectSettings.get("contentWindowPersistentData");
		editor.windowManager.setContentWindowPersistentData(contentWindowPersistentData);

		await this.reloadAssetManager();
		this.updateEditorConnectionsManager();

		this.hasOpeneProject = true;
		this.onProjectOpenCbs.forEach(cb => cb());
		this.onProjectOpenCbs.clear();
	}

	/**
	 * @param {StoredProjectEntry} entry
	 */
	isCurrentProjectEntry(entry) {
		if (!this.currentProjectOpenEvent) return false;
		return this.currentProjectOpenEvent.projectUuid == entry.projectUuid;
	}

	removeAssetManager() {
		if (this.assetManager) {
			this.assetManager.destructor();
		}
		this.assetManager = null;
	}

	async reloadAssetManager() {
		if (!this.currentProjectFileSystem) {
			throw new Error("Unable to reload the asset manager. No active file system.");
		}
		const editor = getEditorInstanceCertain();
		const builtInAssetManager = editor.builtInAssetManager;
		const builtInDefaultAssetLinksManager = editor.builtInDefaultAssetLinksManager;
		const projectAssetTypeManager = editor.projectAssetTypeManager;
		this.assetManager = new AssetManager(this, builtInAssetManager, builtInDefaultAssetLinksManager, projectAssetTypeManager, this.currentProjectFileSystem);
		await this.assetManager.waitForAssetSettingsLoad();
		for (const cb of this.onAssetManagerLoadCbs) {
			cb();
		}
		this.onAssetManagerLoadCbs.clear();
	}

	async waitForAssetManagerLoad() {
		if (this.assetManager && this.assetManager.assetSettingsLoaded) return;
		await new Promise(r => this.onAssetManagerLoadCbs.add(r));
	}

	/**
	 * If the asset manager doesn't exist, waits for it to load and returns it.
	 * Throws an error
	 */
	async getAssetManager() {
		if (this.assetManager) return this.assetManager;
		await this.waitForAssetManagerLoad();
		if (!this.assetManager) {
			throw new Error("Error: assetManager doesn't exist.");
		}
		return this.assetManager;
	}

	markCurrentProjectAsWorthSaving() {
		if (this.currentProjectIsMarkedAsWorthSaving || !this.currentProjectOpenEvent) return;
		this.currentProjectIsMarkedAsWorthSaving = true;
		this.currentProjectOpenEvent.isWorthSaving = true;
		this.fireOnProjectOpenEntryChangeCbs();
	}

	/**
	 * @param {function(StoredProjectEntry):void} cb
	 */
	onProjectOpenEntryChange(cb) {
		this.onProjectOpenEntryChangeCbs.add(cb);
	}

	fireOnProjectOpenEntryChangeCbs() {
		const entry = this.currentProjectOpenEvent;
		if (!entry) return;
		this.onProjectOpenEntryChangeCbs.forEach(cb => cb(entry));
	}

	/**
	 * Waits for {@link openProject} to finish.
	 * @param {boolean} allowExisting Whether it should resolve immediately if a project is already open.
	 */
	async waitForProjectOpen(allowExisting = true) {
		if (allowExisting && this.hasOpeneProject) return;
		await new Promise(r => this.onProjectOpenCbs.add(r));
	}

	async openNewDbProject() {
		const uuid = generateUuid();
		const fileSystem = new EditorFileSystemIndexedDb(uuid);
		const projectName = "Untitled Project";
		await fileSystem.setRootName(projectName);
		await this.openProject(fileSystem, {
			fileSystemType: "db",
			projectUuid: uuid,
			name: projectName,
			isWorthSaving: false,
		}, true);
	}

	/**
	 * @param {import("../../../src/util/mod.js").UuidString} uuid
	 */
	async deleteDbProject(uuid) {
		if (await EditorFileSystemIndexedDb.exists(uuid)) {
			const fileSystem = new EditorFileSystemIndexedDb(uuid);
			await fileSystem.deleteDb();
		}
	}

	async openProjectFromLocalDirectory() {
		const fileSystem = await EditorFileSystemFsa.openUserDir();
		const permission = await fileSystem.getPermission([], {prompt: true, writable: false});
		let name = "Unnamed Filesystem";
		if (permission) {
			name = fileSystem.handle.name;
		}
		const projectUuid = generateUuid();
		this.openProject(fileSystem, {
			fileSystemType: "fsa",
			fileSystemHandle: fileSystem.handle,
			projectUuid,
			name,
			isWorthSaving: false,
		});
	}

	async openNewRemoteProject() {
		const fileSystem = new EditorFileSystemRemote();
		const projectUuid = generateUuid();
		await this.openProject(fileSystem, {
			fileSystemType: "remote",
			projectUuid,
			name: "Remote Filesystem",
			isWorthSaving: false,
		}, true);
		getEditorInstanceCertain().windowManager.focusOrCreateContentWindow(ContentWindowConnections);
	}

	/**
	 * @param {StoredProjectEntry} projectEntry
	 */
	openExistingProject(projectEntry) {
		let fileSystem;
		if (projectEntry.fileSystemType === "db") {
			fileSystem = new EditorFileSystemIndexedDb(projectEntry.projectUuid);
		} else if (projectEntry.fileSystemType == "fsa") {
			fileSystem = new EditorFileSystemFsa(projectEntry.fileSystemHandle);
		} else if (projectEntry.fileSystemType == "remote") {
			fileSystem = new EditorFileSystemRemote();
			this.editorConnectionsManager.waitForAvailableAndConnect({
				uuid: projectEntry.remoteProjectUuid,
				messageHandlerType: projectEntry.remoteProjectConnectionType,
			});
		}
		if (!fileSystem) return;
		this.openProject(fileSystem, projectEntry);
	}

	/**
	 * @param {import("../Util/FileSystems/EditorFileSystem.js").FileSystemExternalChangeCallback} cb
	 */
	onExternalChange(cb) {
		this.onExternalChangeCbs.add(cb);
	}

	/**
	 * @param {import("../Util/FileSystems/EditorFileSystem.js").FileSystemExternalChangeCallback} cb
	 */
	removeOnExternalChange(cb) {
		this.onExternalChangeCbs.delete(cb);
	}

	suggestCheckExternalChanges() {
		if (this.currentProjectFileSystem) {
			this.currentProjectFileSystem.suggestCheckExternalChanges();
		}
	}

	assertLocalSettingsExists() {
		if (!this.localProjectSettings) {
			throw new Error("Unable to get local project settings. Is there no project open?");
		}
		return this.localProjectSettings;
	}

	/**
	 * @param {boolean} allow
	 */
	setEditorConnectionsAllowRemoteIncoming(allow) {
		const settings = this.assertLocalSettingsExists();
		this.editorConnectionsAllowRemoteIncoming = allow;
		if (allow) {
			settings.set("editorConnectionsAllowIncoming", allow);
		} else {
			settings.delete("editorConnectionsAllowIncoming");
		}
		this.updateEditorConnectionsManager();
	}

	async getEditorConnectionsAllowRemoteIncoming() {
		await this.loadEditorConnectionsAllowIncomingInstance.waitForFinish();
		return this.editorConnectionsAllowRemoteIncoming;
	}

	/**
	 * @param {boolean} allow
	 */
	setEditorConnectionsAllowInternalIncoming(allow) {
		const settings = this.assertLocalSettingsExists();
		this.editorConnectionsAllowInternalIncoming = allow;
		if (allow) {
			settings.set("editorConnectionsAllowInternalIncoming", allow);
		} else {
			settings.delete("editorConnectionsAllowInternalIncoming");
		}
		this.updateEditorConnectionsManager();
	}

	async getEditorConnectionsAllowInternalIncoming() {
		await this.loadEditorConnectionsAllowIncomingInstance.waitForFinish();
		return this.editorConnectionsAllowInternalIncoming;
	}

	async loadEditorConnectionsAllowIncoming() {
		if (this.currentProjectIsRemote) {
			this.editorConnectionsAllowRemoteIncoming = false;
			this.editorConnectionsAllowInternalIncoming = false;
		} else {
			const settings = this.assertLocalSettingsExists();
			this.editorConnectionsAllowRemoteIncoming = await settings.get("editorConnectionsAllowIncoming", false);
			this.editorConnectionsAllowInternalIncoming = await settings.get("editorConnectionsAllowInternalIncoming", false);
		}
		this.updateEditorConnectionsManager();
	}

	/**
	 * @param {string?} endpoint
	 */
	setEditorConnectionsDiscoveryEndpoint(endpoint) {
		this.editorConnectionsDiscoveryEndpoint = endpoint;
		this.updateEditorConnectionsManager();
	}

	updateEditorConnectionsManager() {
		const hasValidProject = !!this.currentProjectOpenEvent;

		if (hasValidProject && (this.currentProjectIsRemote || this.editorConnectionsAllowRemoteIncoming)) {
			let endpoint = this.editorConnectionsDiscoveryEndpoint;
			if (!endpoint) endpoint = EditorConnectionsManager.getDefaultEndPoint();
			this.editorConnectionsManager.setDiscoveryEndpoint(endpoint);
		} else {
			this.editorConnectionsManager.setDiscoveryEndpoint(null);
		}

		this.editorConnectionsManager.sendSetIsEditorHost(!this.currentProjectIsRemote);
		if (hasValidProject && (this.editorConnectionsAllowRemoteIncoming || this.editorConnectionsAllowInternalIncoming)) {
			if (this.currentProjectOpenEvent) {
				this.editorConnectionsManager.setProjectMetaData({
					name: this.currentProjectOpenEvent.name,
					uuid: this.currentProjectOpenEvent.projectUuid,
				});
			}
		}
	}

	getEditorConnectionsManager() {
		this.updateEditorConnectionsManager();
		return this.editorConnectionsManager;
	}
}
