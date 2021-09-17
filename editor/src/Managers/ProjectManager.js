import editor from "../editorInstance.js";
import EditorFileSystemNative from "../Util/FileSystems/EditorFileSystemNative.js";
import EditorFileSystemIndexedDb from "../Util/FileSystems/EditorFileSystemIndexedDb.js";
import EditorFileSystemRemote from "../Util/FileSystems/EditorFileSystemRemote.js";
import AssetManager from "../Assets/AssetManager.js";
import EditorConnectionsManager from "../Network/EditorConnections/EditorConnectionsManager.js";
import {generateUuid} from "../Util/Util.js";
import GitIgnoreManager from "./GitIgnoreManager.js";
import ProjectSettingsManager from "./ProjectSettingsManager.js";

/**
 * @typedef {Object} StoredProjectEntry
 * @property {"db" | "native" | "remote"} fileSystemType
 * @property {string} name
 * @property {string} [projectUuid]
 * @property {FileSystemDirectoryHandle} [fileSystemHandle]
 */

export default class ProjectManager {
	constructor() {
		/** @type {?import("../Util/FileSystems/EditorFileSystem.js").default} */
		this.currentProjectFileSystem = null;
		this.currentProjectIsRemote = false;
		this.gitIgnoreManager = null;
		this.projectSettings = null;
		this.localProjectSettings = null;
		this.assetManager = null;
		this.editorConnectionsAllowIncoming = false;
		this.editorConnectionsDiscoveryEndpoint = null;
		this.editorConnectionsManager = null;
		/** @type {Set<function(?EditorConnectionsManager):void>} */
		this.onCurrentEditorConnectionsManagerChangedCbs = new Set();

		/** @type {Set<function(StoredProjectEntry):void>} */
		this.onOpenProjectChangedCbs = new Set();

		this.onExternalChangeCbs = new Set();
		window.addEventListener("focus", () => this.suggestCheckExternalChanges());
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "visible") {
				this.suggestCheckExternalChanges();
			}
		});

		this.onAssetManagerLoadCbs = new Set();
	}

	/**
	 * @param {import("../Util/FileSystems/EditorFileSystem.js").default} fileSystem
	 * @param {StoredProjectEntry} openProjectChangeEvent
	 */
	async openProject(fileSystem, openProjectChangeEvent) {
		this.currentProjectFileSystem = fileSystem;
		this.currentProjectIsRemote = fileSystem instanceof EditorFileSystemRemote;

		this.gitIgnoreManager = new GitIgnoreManager(fileSystem);
		this.projectSettings = new ProjectSettingsManager(fileSystem, ["ProjectSettings", "projectSettings.json"]);
		const localSettingsPath = ["ProjectSettings", "localProjectSettings.json"];
		this.localProjectSettings = new ProjectSettingsManager(fileSystem, localSettingsPath);
		this.localProjectSettings.onFileCreated(() => {
			this.gitIgnoreManager.addEntry(localSettingsPath);
		});

		if (this.editorConnectionsManager) {
			this.editorConnectionsManager.sendSetIsHost(!this.currentProjectIsRemote);
		}

		// todo remove this event when opening a new fileSystem
		fileSystem.onExternalChange(e => {
			for (const cb of this.onExternalChangeCbs) {
				cb(e);
			}
		});
		await editor.windowManager.reloadCurrentWorkspace();
		await this.reloadAssetManager();
		this.onOpenProjectChangedCbs.forEach(cb => cb(openProjectChangeEvent));
		this.updateEditorConnectionsManager();
	}

	async reloadAssetManager() {
		if (this.assetManager) {
			this.assetManager.destructor();
		}
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

	/**
	 * @param {function(StoredProjectEntry):void} cb
	 */
	onOpenProjectChanged(cb) {
		this.onOpenProjectChangedCbs.add(cb);
	}

	openNewDbProject() {
		const uuid = generateUuid();
		const fileSystem = new EditorFileSystemIndexedDb(uuid);
		this.openProject(fileSystem, {
			fileSystemType: "db",
			projectUuid: uuid,
			name: uuid,
		});
	}

	async openProjectFromLocalDirectory() {
		const fileSystem = await EditorFileSystemNative.openUserDir();
		const permission = await fileSystem.getPermission([], {prompt: true, writable: false});
		let name = "Unnamed Filesystem";
		if (permission) {
			name = fileSystem.handle.name;
		}
		this.openProject(fileSystem, {
			fileSystemType: "native",
			fileSystemHandle: fileSystem.handle,
			name,
		});
	}

	async openNewRemoteProject() {
		const fileSystem = new EditorFileSystemRemote();
		await this.openProject(fileSystem, {
			fileSystemType: "remote",
			name: "Remote Filesystem",
		});
		editor.windowManager.focusOrCreateContentWindowType("connections");
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
	setEditorConnectionsAllowIncoming(allow) {
		this.editorConnectionsAllowIncoming = allow;
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
		const shouldHaveManager = this.currentProjectIsRemote || this.editorConnectionsAllowIncoming;
		let endpoint = this.editorConnectionsDiscoveryEndpoint;
		if (!endpoint) endpoint = EditorConnectionsManager.getDefaultEndPoint();

		if (!shouldHaveManager && this.editorConnectionsManager) {
			this.editorConnectionsManager.destructor();
			this.editorConnectionsManager = null;
			this.fireCurrentEditorConnectionsManagerChange(null);
		} else if (shouldHaveManager && !this.editorConnectionsManager) {
			this.editorConnectionsManager = new EditorConnectionsManager();
			this.editorConnectionsManager.sendSetIsHost(!this.currentProjectIsRemote);
			this.fireCurrentEditorConnectionsManagerChange(this.editorConnectionsManager);
		}

		if (shouldHaveManager) {
			this.editorConnectionsManager.setEndpoint(endpoint);
		}
	}

	getEditorConnectionsManager() {
		this.updateEditorConnectionsManager();
		return this.editorConnectionsManager;
	}

	/**
	 * @param {function(?EditorConnectionsManager):void} cb
	 */
	onCurrentEditorConnectionsManagerChanged(cb) {
		this.onCurrentEditorConnectionsManagerChangedCbs.add(cb);
	}

	/**
	 * @param {?EditorConnectionsManager} manager
	 */
	fireCurrentEditorConnectionsManagerChange(manager) {
		this.onCurrentEditorConnectionsManagerChangedCbs.forEach(cb => cb(manager));
	}
}
