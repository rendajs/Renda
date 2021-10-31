import editor from "../editorInstance.js";
import EditorFileSystemNative from "../Util/FileSystems/EditorFileSystemNative.js";
import EditorFileSystemIndexedDb from "../Util/FileSystems/EditorFileSystemIndexedDb.js";
import EditorFileSystemRemote from "../Util/FileSystems/EditorFileSystemRemote.js";
import AssetManager from "../Assets/AssetManager.js";
import EditorConnectionsManager from "../Network/EditorConnections/EditorConnectionsManager.js";
import {generateUuid} from "../Util/Util.js";
import GitIgnoreManager from "./GitIgnoreManager.js";
import ProjectSettingsManager from "./ProjectSettingsManager.js";
import EditorConnection from "../Network/EditorConnections/EditorConnection.js";
import SingleInstancePromise from "../../../src/Util/SingleInstancePromise.js";
import {ContentWindowConnections} from "../WindowManagement/ContentWindows/ContentWindowConnections.js";

/**
 * @typedef {Object} StoredProjectEntry
 * @property {"db" | "native" | "remote"} fileSystemType
 * @property {string} name
 * @property {import("../Util/Util.js").UuidString} projectUuid
 * @property {boolean} isWorthSaving
 * @property {string} [alias = ""]
 * @property {FileSystemDirectoryHandle} [fileSystemHandle]
 * @property {import("../Util/Util.js").UuidString} [remoteProjectUuid]
 * @property {import("../Network/EditorConnections/EditorConnectionsManager.js").MessageHandlerType} [remoteProjectConnectionType]
 */

export default class ProjectManager {
	#boundOnFileSystemExternalChange;
	#boundOnFileSystemBeforeAnyChange;
	#boundOnFileSystemRootNameChange;

	constructor() {
		/** @type {?import("../Util/FileSystems/EditorFileSystem.js").default} */
		this.currentProjectFileSystem = null;
		this.currentProjectOpenEvent = null;
		this.currentProjectIsMarkedAsWorthSaving = false;
		this.currentProjectIsRemote = false;
		this.gitIgnoreManager = null;
		this.projectSettings = null;
		this.localProjectSettings = null;
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
			if (pickedAvailableConnection && pickedAvailableConnection.projectMetaData) {
				const mataData = pickedAvailableConnection.projectMetaData;
				this.currentProjectOpenEvent.name = mataData.name;
				this.currentProjectOpenEvent.fileSystemType = "remote";
				this.currentProjectOpenEvent.remoteProjectUuid = mataData.uuid;
				this.currentProjectOpenEvent.remoteProjectConnectionType = pickedAvailableConnection.messageHandlerType;
				const fileSystem = /** @type {EditorFileSystemRemote} */ (this.currentProjectFileSystem);
				fileSystem.setConnection(pickedConnection);
				this.markCurrentProjectAsWorthSaving();
			}
		});

		this.#boundOnFileSystemExternalChange = e => {
			for (const cb of this.onExternalChangeCbs) {
				cb(e);
			}
		};
		this.#boundOnFileSystemBeforeAnyChange = () => {
			this.markCurrentProjectAsWorthSaving();
		};
		this.#boundOnFileSystemRootNameChange = newName => {
			this.currentProjectOpenEvent.name = newName;
			this.fireOnProjectOpenEntryChangeCbs();
		};

		/** @type {Set<function(StoredProjectEntry):void>} */
		this.onProjectOpenEntryChangeCbs = new Set();

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
	 * @param {import("../Util/FileSystems/EditorFileSystem.js").default} fileSystem
	 * @param {StoredProjectEntry} openProjectChangeEvent
	 */
	async openProject(fileSystem, openProjectChangeEvent) {
		if (this.currentProjectFileSystem) {
			this.currentProjectFileSystem.removeOnExternalChange(this.#boundOnFileSystemExternalChange);
			this.currentProjectFileSystem.removeOnBeforeAnyChange(this.#boundOnFileSystemBeforeAnyChange);
			this.currentProjectFileSystem.removeOnRootNameChange(this.#boundOnFileSystemRootNameChange);
		}
		this.currentProjectFileSystem = fileSystem;
		this.currentProjectIsRemote = fileSystem instanceof EditorFileSystemRemote;
		this.currentProjectOpenEvent = openProjectChangeEvent;
		this.currentProjectIsMarkedAsWorthSaving = false;

		this.gitIgnoreManager = new GitIgnoreManager(fileSystem);
		this.projectSettings = new ProjectSettingsManager(fileSystem, ["ProjectSettings", "projectSettings.json"]);
		const localSettingsPath = ["ProjectSettings", "localProjectSettings.json"];
		this.localProjectSettings = new ProjectSettingsManager(fileSystem, localSettingsPath);
		this.localProjectSettings.onFileCreated(() => {
			this.gitIgnoreManager.addEntry(localSettingsPath);
		});

		this.loadEditorConnectionsAllowIncomingInstance.run();

		fileSystem.onExternalChange(this.#boundOnFileSystemExternalChange);
		fileSystem.onBeforeAnyChange(this.#boundOnFileSystemBeforeAnyChange);
		fileSystem.onRootNameChange(this.#boundOnFileSystemRootNameChange);
		if (openProjectChangeEvent.fileSystemType == "db" && !this.currentProjectIsMarkedAsWorthSaving) {
			this.fireOnProjectOpenEntryChangeCbs();
		}
		this.removeAssetManager();
		await editor.windowManager.reloadCurrentWorkspace();
		await this.reloadAssetManager();
		this.updateEditorConnectionsManager();
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
		this.assetManager = new AssetManager();
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

	markCurrentProjectAsWorthSaving() {
		if (this.currentProjectIsMarkedAsWorthSaving) return;
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
		this.onProjectOpenEntryChangeCbs.forEach(cb => cb(this.currentProjectOpenEvent));
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
		});
	}

	/**
	 * @param {import("../Util/Util.js").UuidString} uuid
	 */
	async deleteDbProject(uuid) {
		if (await EditorFileSystemIndexedDb.exists(uuid)) {
			const fileSystem = new EditorFileSystemIndexedDb(uuid);
			await fileSystem.deleteDb();
		}
	}

	async openProjectFromLocalDirectory() {
		const fileSystem = await EditorFileSystemNative.openUserDir();
		const permission = await fileSystem.getPermission([], {prompt: true, writable: false});
		let name = "Unnamed Filesystem";
		if (permission) {
			name = fileSystem.handle.name;
		}
		const projectUuid = generateUuid();
		this.openProject(fileSystem, {
			fileSystemType: "native",
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
		});
		editor.windowManager.focusOrCreateContentWindow(ContentWindowConnections);
	}

	/**
	 * @param {StoredProjectEntry} projectEntry
	 */
	openExistingProject(projectEntry) {
		let fileSystem;
		if (projectEntry.fileSystemType === "db") {
			fileSystem = new EditorFileSystemIndexedDb(projectEntry.projectUuid);
		} else if (projectEntry.fileSystemType == "native") {
			fileSystem = new EditorFileSystemNative(projectEntry.fileSystemHandle);
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

	onExternalChange(cb) {
		this.onExternalChangeCbs.add(cb);
	}

	removeOnExternalChange(cb) {
		this.onExternalChangeCbs.delete(cb);
	}

	suggestCheckExternalChanges() {
		if (this.currentProjectFileSystem) {
			this.currentProjectFileSystem.suggestCheckExternalChanges();
		}
	}

	/**
	 * @param {boolean} allow
	 */
	setEditorConnectionsAllowRemoteIncoming(allow) {
		this.editorConnectionsAllowRemoteIncoming = allow;
		if (allow) {
			this.localProjectSettings.set("editorConnectionsAllowIncoming", allow);
		} else {
			this.localProjectSettings.delete("editorConnectionsAllowIncoming");
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
		this.editorConnectionsAllowInternalIncoming = allow;
		if (allow) {
			this.localProjectSettings.set("editorConnectionsAllowInternalIncoming", allow);
		} else {
			this.localProjectSettings.delete("editorConnectionsAllowInternalIncoming");
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
			this.editorConnectionsAllowRemoteIncoming = await this.localProjectSettings.get("editorConnectionsAllowIncoming", false);
			this.editorConnectionsAllowInternalIncoming = await this.localProjectSettings.get("editorConnectionsAllowInternalIncoming", false);
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
		if (this.currentProjectIsRemote || this.editorConnectionsAllowRemoteIncoming) {
			let endpoint = this.editorConnectionsDiscoveryEndpoint;
			if (!endpoint) endpoint = EditorConnectionsManager.getDefaultEndPoint();
			this.editorConnectionsManager.setDiscoveryEndpoint(endpoint);
		} else {
			this.editorConnectionsManager.setDiscoveryEndpoint(null);
		}

		this.editorConnectionsManager.sendSetIsEditorHost(!this.currentProjectIsRemote);
		if (this.editorConnectionsAllowRemoteIncoming || this.editorConnectionsAllowInternalIncoming) {
			this.editorConnectionsManager.setProjectMetaData({
				name: this.currentProjectOpenEvent.name,
				uuid: this.currentProjectOpenEvent.projectUuid,
			});
		}
	}

	getEditorConnectionsManager() {
		this.updateEditorConnectionsManager();
		return this.editorConnectionsManager;
	}
}
