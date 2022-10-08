import {getEditorInstance} from "../editorInstance.js";
import {FsaEditorFileSystem} from "../util/fileSystems/FsaEditorFileSystem.js";
import {IndexedDbEditorFileSystem} from "../util/fileSystems/IndexedDbEditorFileSystem.js";
import {RemoteEditorFileSystem} from "../util/fileSystems/RemoteEditorFileSystem.js";
import {AssetManager} from "../assets/AssetManager.js";
import {EditorConnectionsManager} from "../network/editorConnections/EditorConnectionsManager.js";
import {generateUuid} from "../../../src/util/mod.js";
import {GitIgnoreManager} from "./GitIgnoreManager.js";
import {ProjectSettingsManager} from "./ProjectSettingsManager.js";
import {EditorConnection} from "../network/editorConnections/EditorConnection.js";
import {SingleInstancePromise} from "../../../src/util/SingleInstancePromise.js";
import {ContentWindowConnections} from "../windowManagement/contentWindows/ContentWindowConnections.js";

/**
 * @typedef {object} StoredProjectEntryBase
 * @property {string} name
 * @property {import("../../../src/util/mod.js").UuidString} projectUuid
 * @property {boolean} [isWorthSaving = false]
 * @property {string} [alias = ""]
 */

/**
 * @typedef {{}} StoredProjectEntryDbProps
 */

/**
 * @typedef {object} StoredProjectEntryFsaProps
 * @property {FileSystemDirectoryHandle} fileSystemHandle
 */

/**
 * @typedef {object} StoredProjectEntryRemoteProps
 * @property {import("../../../src/util/mod.js").UuidString} [remoteProjectUuid]
 * @property {import("../network/editorConnections/EditorConnectionsManager.js").MessageHandlerType} [remoteProjectConnectionType]
 */

/**
 * @typedef {object} StoredProjectEntryMap
 * @property {StoredProjectEntryDbProps} db
 * @property {StoredProjectEntryFsaProps} fsa
 * @property {StoredProjectEntryRemoteProps} remote
 */

/** @typedef {keyof StoredProjectEntryMap} FsType */

/**
 * @template T
 * @typedef {T extends FsType ? {fileSystemType: T} & StoredProjectEntryBase & StoredProjectEntryMap[T] : never} StoredProjectEntry
 */

/** @typedef {StoredProjectEntry<FsType>} StoredProjectEntryAny */

export class ProjectManager {
	#boundOnFileSystemRootNameChange;

	#boundSaveContentWindowPersistentData;

	/** @type {Set<import("../util/fileSystems/EditorFileSystem.js").FileSystemChangeCallback>} */
	#onFileChangeCbs = new Set();

	constructor() {
		/** @type {?import("../util/fileSystems/EditorFileSystem.js").EditorFileSystem} */
		this.currentProjectFileSystem = null;
		/** @type {StoredProjectEntryAny?} */
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
				const metaData = pickedAvailableConnection.projectMetaData;
				if (!this.currentProjectOpenEvent) {
					throw new Error("An active connection was made before a project entry was created.");
				}
				this.currentProjectOpenEvent = {
					name: metaData.name,
					fileSystemType: "remote",
					projectUuid: this.currentProjectOpenEvent.projectUuid,
					remoteProjectUuid: metaData.uuid,
					remoteProjectConnectionType: pickedAvailableConnection.messageHandlerType,
				};
				const fileSystem = /** @type {RemoteEditorFileSystem} */ (this.currentProjectFileSystem);
				fileSystem.setConnection(pickedConnection);
				this.markCurrentProjectAsWorthSaving();
			}
		});

		/** @type {(newName: string) => void} */
		this.#boundOnFileSystemRootNameChange = newName => {
			if (!this.currentProjectOpenEvent) {
				throw new Error("Cannot change the name of a remote project before it has been created.");
			}
			this.currentProjectOpenEvent.name = newName;
			this.fireOnProjectOpenEntryChangeCbs();
		};

		/** @type {(data: unknown[]) => Promise<void>} */
		this.#boundSaveContentWindowPersistentData = async data => {
			if (!this.localProjectSettings) return;
			const key = "contentWindowPersistentData";
			if (data.length <= 0) {
				await this.localProjectSettings.delete(key);
			} else {
				await this.localProjectSettings.set(key, data);
			}
		};

		/** @type {Set<(entry: StoredProjectEntryAny) => any>} */
		this.onProjectOpenEntryChangeCbs = new Set();

		/** @type {Set<Function>} */
		this.onProjectOpenCbs = new Set();
		this.hasOpeneProject = false;

		window.addEventListener("focus", () => this.suggestCheckExternalChanges());
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "visible") {
				this.suggestCheckExternalChanges();
			}
		});

		/** @type {Set<() => void>} */
		this.onAssetManagerLoadCbs = new Set();

		this.loadEditorConnectionsAllowIncomingInstance = new SingleInstancePromise(async () => {
			await this.loadEditorConnectionsAllowIncoming();
		});
	}

	/**
	 * @param {import("../util/fileSystems/EditorFileSystem.js").EditorFileSystem} fileSystem
	 * @param {StoredProjectEntryAny} openProjectChangeEvent
	 * @param {boolean} fromUserGesture
	 */
	async openProject(fileSystem, openProjectChangeEvent, fromUserGesture) {
		// todo: handle multiple calls to openProject by cancelling any current running calls.
		if (this.currentProjectFileSystem) {
			this.currentProjectFileSystem.removeOnChange(this.#onFileSystemChange);
			this.currentProjectFileSystem.removeOnRootNameChange(this.#boundOnFileSystemRootNameChange);
		}
		this.currentProjectFileSystem = fileSystem;
		this.currentProjectIsRemote = fileSystem instanceof RemoteEditorFileSystem;
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

		fileSystem.onChange(this.#onFileSystemChange);
		fileSystem.onRootNameChange(this.#boundOnFileSystemRootNameChange);
		if (openProjectChangeEvent.fileSystemType == "db" && !this.currentProjectIsMarkedAsWorthSaving) {
			this.fireOnProjectOpenEntryChangeCbs();
		}
		this.removeAssetManager();
		const editor = getEditorInstance();
		editor.windowManager.removeOnContentWindowPersistentDataFlushRequest(this.#boundSaveContentWindowPersistentData);
		await editor.windowManager.reloadCurrentWorkspace();
		editor.windowManager.onContentWindowPersistentDataFlushRequest(this.#boundSaveContentWindowPersistentData);

		await this.reloadAssetManager();
		await this.waitForAssetListsLoad();
		this.updateEditorConnectionsManager();

		const contentWindowPersistentData = await this.localProjectSettings.get("contentWindowPersistentData");
		editor.windowManager.setContentWindowPersistentData(contentWindowPersistentData);

		this.hasOpeneProject = true;
		this.onProjectOpenCbs.forEach(cb => cb());
		this.onProjectOpenCbs.clear();
	}

	/**
	 * If asset settings are already loaded, this is a no-op.
	 * If not, this will load the asset settings and wait for them to load.
	 * A permission prompt might be shown, so this should only be called from
	 * a user gesture.
	 */
	async loadAssetSettingsFromUserGesture() {
		const assetManager = this.assertAssetManagerExists();
		await assetManager.loadAssetSettings(true);
	}

	/**
	 * @param {StoredProjectEntryAny} entry
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
		const editor = getEditorInstance();
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

	/**
	 * Returns a promise that resolves once an asset manager has been loaded and
	 * and its list of assets, both built in as well as project assets, have been loaded.
	 */
	async waitForAssetListsLoad() {
		const assetManager = await this.getAssetManager();
		await assetManager.waitForAssetListsLoad();
	}

	/**
	 * If the asset manager doesn't exist, waits for it to load and returns it.
	 * Throws an error if it still doesn't exist after loading.
	 */
	async getAssetManager() {
		if (this.assetManager && this.assetManager.assetSettingsLoaded) return this.assetManager;
		/** @type {Promise<void>} */
		const promise = new Promise(r => this.onAssetManagerLoadCbs.add(r));
		await promise;
		return this.assertAssetManagerExists();
	}

	assertAssetManagerExists() {
		if (!this.assetManager) {
			throw new Error("Assertion failed: assetManager doesn't exist.");
		}
		return this.assetManager;
	}

	/** @type {(e: import("../util/fileSystems/EditorFileSystem.js").FileSystemChangeEvent) => void} */
	#onFileSystemChange = e => {
		for (const cb of this.#onFileChangeCbs) {
			cb(e);
		}
		this.markCurrentProjectAsWorthSaving();
	};

	markCurrentProjectAsWorthSaving() {
		if (this.currentProjectIsMarkedAsWorthSaving || !this.currentProjectOpenEvent) return;
		this.currentProjectIsMarkedAsWorthSaving = true;
		this.currentProjectOpenEvent.isWorthSaving = true;
		this.fireOnProjectOpenEntryChangeCbs();
	}

	/**
	 * @param {(entry: StoredProjectEntryAny) => any} cb
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

	/**
	 * @param {boolean} fromUserGesture
	 */
	async openNewDbProject(fromUserGesture) {
		const uuid = generateUuid();
		const fileSystem = new IndexedDbEditorFileSystem(uuid);
		const projectName = "Untitled Project";
		await fileSystem.setRootName(projectName);
		await this.openProject(fileSystem, {
			fileSystemType: "db",
			projectUuid: uuid,
			name: projectName,
			isWorthSaving: false,
		}, fromUserGesture);
	}

	/**
	 * @param {StoredProjectEntryAny} entry
	 */
	async deleteDbProject(entry) {
		if (this.isCurrentProjectEntry(entry)) {
			await this.openNewDbProject(true);
		}
		const uuid = entry.projectUuid;
		if (await IndexedDbEditorFileSystem.exists(uuid)) {
			const fileSystem = new IndexedDbEditorFileSystem(uuid);
			await fileSystem.deleteDb();
		}
	}

	async openProjectFromLocalDirectory() {
		const fileSystem = await FsaEditorFileSystem.openUserDir();
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
		}, true);
	}

	/**
	 * @param {boolean} fromUserGesture
	 */
	async openNewRemoteProject(fromUserGesture) {
		const fileSystem = new RemoteEditorFileSystem();
		const projectUuid = generateUuid();
		await this.openProject(fileSystem, {
			fileSystemType: "remote",
			projectUuid,
			name: "Remote Filesystem",
			isWorthSaving: false,
		}, fromUserGesture);
		getEditorInstance().windowManager.focusOrCreateContentWindow(ContentWindowConnections);
	}

	/**
	 * @param {StoredProjectEntryAny} projectEntry
	 * @param {boolean} fromUserGesture
	 */
	openExistingProject(projectEntry, fromUserGesture) {
		let fileSystem;
		if (projectEntry.fileSystemType === "db") {
			fileSystem = new IndexedDbEditorFileSystem(projectEntry.projectUuid);
		} else if (projectEntry.fileSystemType == "fsa") {
			fileSystem = new FsaEditorFileSystem(projectEntry.fileSystemHandle);
		} else if (projectEntry.fileSystemType == "remote") {
			fileSystem = new RemoteEditorFileSystem();
			console.log(projectEntry);
			if (!projectEntry.remoteProjectUuid || !projectEntry.remoteProjectConnectionType) {
				throw new Error("Unable to open remote project. Remote project data is corrupt.");
			}
			this.editorConnectionsManager.waitForAvailableAndConnect({
				uuid: projectEntry.remoteProjectUuid,
				messageHandlerType: projectEntry.remoteProjectConnectionType,
			});
		}
		if (!fileSystem) return;
		this.openProject(fileSystem, projectEntry, fromUserGesture);
	}

	/**
	 * Registers a callback that gets fired whenever a file or folder of the current
	 * project is changed. This callback will keep working when switching between projects.
	 * You can use this instead of `onChange` on the {@linkcode currentProjectFileSystem},
	 * that way you don't have to keep registering a new callback whenever the current project changes.
	 * @param {import("../util/fileSystems/EditorFileSystem.js").FileSystemChangeCallback} cb
	 */
	onFileChange(cb) {
		this.#onFileChangeCbs.add(cb);
	}

	/**
	 * @param {import("../util/fileSystems/EditorFileSystem.js").FileSystemChangeCallback} cb
	 */
	removeOnFileChange(cb) {
		this.#onFileChangeCbs.delete(cb);
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
