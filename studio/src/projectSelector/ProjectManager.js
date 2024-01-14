import {getStudioInstance} from "../studioInstance.js";
import {FsaStudioFileSystem} from "../util/fileSystems/FsaStudioFileSystem.js";
import {IndexedDbStudioFileSystem} from "../util/fileSystems/IndexedDbStudioFileSystem.js";
import {RemoteStudioFileSystem} from "../util/fileSystems/RemoteStudioFileSystem.js";
import {AssetManager} from "../assets/AssetManager.js";
import {generateUuid} from "../../../src/util/util.js";
import {GitIgnoreManager} from "./GitIgnoreManager.js";
import {ContentWindowConnections} from "../windowManagement/contentWindows/ContentWindowConnections.js";
import {FilePreferencesLocation} from "../preferences/preferencesLocation/FilePreferencesLocation.js";

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
 * @property {string} [remoteProjectConnectionType]
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

/** @typedef {(assetManager: AssetManager) => void} OnAssetManagerChangeCallback */

export class ProjectManager {
	#boundOnFileSystemRootNameChange;

	/** @type {FilePreferencesLocation?} */
	#currentPreferencesLocation = null;
	/** @type {FilePreferencesLocation?} */
	#currentVersionControlPreferencesLocation = null;

	/** @type {Set<import("../util/fileSystems/StudioFileSystem.js").FileSystemChangeCallback>} */
	#onFileChangeCbs = new Set();

	/** @type {Set<() => void>} */
	#onAssetManagerLoadPromiseCbs = new Set();

	/** @type {Set<OnAssetManagerChangeCallback>} */
	#onAssetManagerChangeCbs = new Set();

	/** @type {StoredProjectEntryAny?} */
	#currentProjectOpenEvent = null;
	/** @type {Set<() => void>} */
	#onProjectOpenCbs = new Set();
	/** @type {Set<() => void>} */
	#onProjectOpenOnceCbs = new Set();
	#hasOpenProject = false;
	get currentProjectIsRemote() {
		return this.currentProjectFileSystem instanceof RemoteStudioFileSystem;
	}

	/**
	 * Technically some file system entries might not have write permissions even though the root does.
	 * But in practice the root having write permissions always means that all files within the directory have permission.
	 * The only exception would be when the user manually revokes permissions.
	 */
	#rootHasWritePermissions = false;

	/** @type {Set<() => void>} */
	#onRootHasWritePermissionsChangeCbs = new Set();

	/** @type {Set<(entry: StoredProjectEntryAny?) => any>} */
	#onProjectOpenEntryChangeCbs = new Set();

	constructor() {
		/** @type {import("../util/fileSystems/StudioFileSystem.js").StudioFileSystem?} */
		this.currentProjectFileSystem = null;
		this.currentProjectIsMarkedAsWorthSaving = false;
		this.gitIgnoreManager = null;

		/** @type {AssetManager?} */
		this.assetManager = null;

		/** @type {(newName: string) => void} */
		this.#boundOnFileSystemRootNameChange = newName => {
			if (!this.#currentProjectOpenEvent) {
				throw new Error("Cannot change the name of a remote project before it has been created.");
			}
			this.#currentProjectOpenEvent.name = newName;
			this.#fireOnProjectOpenEntryChangeCbs();
		};

		window.addEventListener("focus", () => this.suggestCheckExternalChanges());
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "visible") {
				this.suggestCheckExternalChanges();
			}
		});
	}

	/**
	 * @param {import("../util/fileSystems/StudioFileSystem.js").StudioFileSystem} fileSystem
	 * @param {StoredProjectEntryAny} openProjectChangeEvent
	 * @param {boolean} fromUserGesture Whether the call is made as a result from the user clicking something.
	 * If this is false, things like preferences will quietly wait for user permission without any prompts.
	 * But if this is true, an attempt will be made to read files immediately, likely triggering a permission prompt.
	 * @param {object} hooks
	 * @param {() => Promise<void>} [hooks.beforeAssetManagerReload]
	 */
	async openProject(fileSystem, openProjectChangeEvent, fromUserGesture, hooks = {}) {
		// todo: handle multiple calls to openProject by cancelling any current running calls.
		if (this.currentProjectFileSystem) {
			this.currentProjectFileSystem.removeOnChange(this.#onFileSystemChange);
			this.currentProjectFileSystem.removeOnRootNameChange(this.#boundOnFileSystemRootNameChange);
		}
		this.currentProjectFileSystem = fileSystem;
		this.#currentProjectOpenEvent = openProjectChangeEvent;
		this.currentProjectIsMarkedAsWorthSaving = false;
		this.#fireOnProjectOpenEntryChangeCbs();

		this.#rootHasWritePermissions = false;
		this.#onRootHasWritePermissionsChangeCbs.forEach(cb => cb());
		(async () => {
			await fileSystem.waitForPermission([], {writable: true});
			if (fileSystem != this.currentProjectFileSystem) return;
			this.#rootHasWritePermissions = true;
			this.#onRootHasWritePermissionsChangeCbs.forEach(cb => cb());
		})();

		const gitIgnoreManager = new GitIgnoreManager(fileSystem);
		this.gitIgnoreManager = gitIgnoreManager;

		const studio = getStudioInstance();

		if (this.#currentPreferencesLocation) {
			studio.preferencesManager.removeLocation(this.#currentPreferencesLocation);
		}
		if (this.#currentVersionControlPreferencesLocation) {
			studio.preferencesManager.removeLocation(this.#currentVersionControlPreferencesLocation);
		}
		const localPreferencesPath = [".renda", "localPreferences.json"];
		this.#currentPreferencesLocation = new FilePreferencesLocation("project", fileSystem, localPreferencesPath, fromUserGesture);
		this.#currentPreferencesLocation.onFileCreated(() => {
			gitIgnoreManager.addEntry(localPreferencesPath);
		});
		studio.preferencesManager.addLocation(this.#currentPreferencesLocation);
		this.#currentVersionControlPreferencesLocation = new FilePreferencesLocation("version-control", fileSystem, [".renda", "sharedPreferences.json"], fromUserGesture);
		studio.preferencesManager.addLocation(this.#currentVersionControlPreferencesLocation);

		fileSystem.onChange(this.#onFileSystemChange);
		fileSystem.onRootNameChange(this.#boundOnFileSystemRootNameChange);
		this.removeAssetManager();
		studio.windowManager.removeOnContentWindowPreferencesFlushRequest(this.#contentWindowPreferencesFlushRequest);
		await studio.windowManager.reloadWorkspaceInstance.run();
		studio.windowManager.onContentWindowPreferencesFlushRequest(this.#contentWindowPreferencesFlushRequest);

		if (hooks.beforeAssetManagerReload) await hooks.beforeAssetManagerReload();

		await this.reloadAssetManager();
		await this.waitForAssetListsLoad();

		const contentWindowPreferences = await this.#currentPreferencesLocation.getContentWindowPreferences();
		studio.windowManager.setContentWindowPreferences(contentWindowPreferences);

		this.#hasOpenProject = true;
		this.#onProjectOpenCbs.forEach(cb => cb());
		this.#onProjectOpenOnceCbs.forEach(cb => cb());
		this.#onProjectOpenOnceCbs.clear();
	}

	/**
	 * @param {import("../windowManagement/WindowManager.js").ContentWindowPersistentDiskData[] | null} data
	 */
	#contentWindowPreferencesFlushRequest = async data => {
		if (!this.#currentPreferencesLocation) return;
		await this.#currentPreferencesLocation.setContentWindowPreferences(data);
	};

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
		if (!this.#currentProjectOpenEvent) return false;
		return this.#currentProjectOpenEvent.projectUuid == entry.projectUuid;
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
		const studio = getStudioInstance();
		const builtInAssetManager = studio.builtInAssetManager;
		const builtInDefaultAssetLinksManager = studio.builtInDefaultAssetLinksManager;
		const projectAssetTypeManager = studio.projectAssetTypeManager;
		const assetManager = new AssetManager(this, builtInAssetManager, builtInDefaultAssetLinksManager, projectAssetTypeManager, this.currentProjectFileSystem);
		this.assetManager = assetManager;
		await this.assetManager.waitForAssetSettingsLoad();
		this.#onAssetManagerLoadPromiseCbs.forEach(cb => cb());
		this.#onAssetManagerLoadPromiseCbs.clear();
		this.#onAssetManagerChangeCbs.forEach(cb => cb(assetManager));
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
	 */
	async getAssetManager() {
		if (this.assetManager && this.assetManager.assetSettingsLoaded) return this.assetManager;
		/** @type {Promise<void>} */
		const promise = new Promise(r => this.#onAssetManagerLoadPromiseCbs.add(r));
		await promise;
		return this.assertAssetManagerExists();
	}

	/**
	 * @param {OnAssetManagerChangeCallback} cb
	 */
	onAssetManagerChange(cb) {
		this.#onAssetManagerChangeCbs.add(cb);
	}

	/**
	 * @param {OnAssetManagerChangeCallback} cb
	 */
	removeOnAssetManagerChange(cb) {
		this.#onAssetManagerChangeCbs.delete(cb);
	}

	assertAssetManagerExists() {
		if (!this.assetManager) {
			throw new Error("Assertion failed: assetManager doesn't exist.");
		}
		return this.assetManager;
	}

	/** @type {(e: import("../util/fileSystems/StudioFileSystem.js").FileSystemChangeEvent) => void} */
	#onFileSystemChange = e => {
		for (const cb of this.#onFileChangeCbs) {
			cb(e);
		}
		this.markCurrentProjectAsWorthSaving();
	};

	markCurrentProjectAsWorthSaving() {
		if (this.currentProjectIsMarkedAsWorthSaving || !this.#currentProjectOpenEvent) return;
		this.currentProjectIsMarkedAsWorthSaving = true;
		this.#currentProjectOpenEvent.isWorthSaving = true;
		this.#fireOnProjectOpenEntryChangeCbs();
	}

	/**
	 * Registers a callback that fires whenever the metadata
	 * of the currently open project changes.
	 * @param {(entry: StoredProjectEntryAny?) => any} cb
	 */
	onProjectOpenEntryChange(cb) {
		this.#onProjectOpenEntryChangeCbs.add(cb);
	}

	#fireOnProjectOpenEntryChangeCbs() {
		const entry = this.#currentProjectOpenEvent;
		this.#onProjectOpenEntryChangeCbs.forEach(cb => cb(entry));
	}

	/**
	 * Waits for {@link openProject} to finish.
	 * @param {boolean} allowExisting Whether it should resolve immediately if a project is already open.
	 */
	async waitForProjectOpen(allowExisting = true) {
		if (allowExisting && this.#hasOpenProject) return;
		/** @type {Promise<void>} */
		const promise = new Promise(r => this.#onProjectOpenOnceCbs.add(r));
		await promise;
	}

	/**
	 * Registers a callback that fires whenever a new project is opened.
	 * The callback fires when the project has been fully loaded, including its asset manager, window manager, and preferences.
	 * @param {() => void} cb
	 */
	onProjectOpen(cb) {
		this.#onProjectOpenCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	onRootHasWritePermissionsChange(cb) {
		this.#onRootHasWritePermissionsChangeCbs.add(cb);
	}

	/**
	 * @param {boolean} fromUserGesture
	 */
	async openNewDbProject(fromUserGesture) {
		const uuid = generateUuid();
		const fileSystem = new IndexedDbStudioFileSystem(uuid);
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
		if (await IndexedDbStudioFileSystem.exists(uuid)) {
			const fileSystem = new IndexedDbStudioFileSystem(uuid);
			await fileSystem.deleteDb();
		}
	}

	async openProjectFromLocalDirectory() {
		const fileSystem = await FsaStudioFileSystem.openUserDir();
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
		this.markCurrentProjectAsWorthSaving();
	}

	/**
	 * @param {boolean} fromUserGesture
	 */
	async openNewRemoteProject(fromUserGesture) {
		const fileSystem = new RemoteStudioFileSystem();
		const projectUuid = generateUuid();
		getStudioInstance().windowManager.focusOrCreateContentWindow(ContentWindowConnections);
		await this.openProject(fileSystem, {
			fileSystemType: "remote",
			projectUuid,
			name: "Remote Filesystem",
			isWorthSaving: false,
		}, fromUserGesture);
	}

	#assertProjectOpenEvent() {
		if (!this.#currentProjectOpenEvent) {
			throw new Error("Assertion failed: An active connection was made before a project entry was created.");
		}
		return this.#currentProjectOpenEvent;
	}

	getRemoteFileSystem() {
		const openEvent = this.#assertProjectOpenEvent();
		if (openEvent.fileSystemType != "remote" || !(this.currentProjectFileSystem instanceof RemoteStudioFileSystem)) {
			throw new Error("Assertion failed: Current file system is not a remote file system.");
		}
		return this.currentProjectFileSystem;
	}

	/**
	 * Assigns a connection to the current file system and project open event.
	 * Throws if the current project is not a remote project or if a connection has already been assigned.
	 * @param {import("../network/studioConnections/handlers.js").StudioClientHostConnection} connection
	 */
	assignRemoteConnection(connection) {
		const openEvent = this.#assertProjectOpenEvent();
		const fileSystem = this.getRemoteFileSystem();
		const metadata = connection.projectMetadata;
		if (!metadata) {
			throw new Error("Assertion failed: Connection does not have project metadata.");
		}
		this.#currentProjectOpenEvent = {
			name: metadata.name,
			fileSystemType: "remote",
			projectUuid: openEvent.projectUuid,
			remoteProjectUuid: metadata.uuid,
			remoteProjectConnectionType: connection.connectionType,
		};
		fileSystem.setConnection(connection);
		this.markCurrentProjectAsWorthSaving();
	}

	/**
	 * @param {StoredProjectEntryAny} projectEntry
	 * @param {boolean} fromUserGesture
	 */
	async openExistingProject(projectEntry, fromUserGesture) {
		if (projectEntry.fileSystemType === "db") {
			await this.openProject(new IndexedDbStudioFileSystem(projectEntry.projectUuid), projectEntry, fromUserGesture);
		} else if (projectEntry.fileSystemType == "fsa") {
			await this.openProject(new FsaStudioFileSystem(projectEntry.fileSystemHandle), projectEntry, fromUserGesture);
		} else if (projectEntry.fileSystemType == "remote") {
			if (!projectEntry.remoteProjectUuid || !projectEntry.remoteProjectConnectionType) {
				throw new Error("Unable to open remote project. Remote project data is corrupt.");
			}
			await this.openProject(new RemoteStudioFileSystem(), projectEntry, fromUserGesture, {
				async beforeAssetManagerReload() {
					const connection = await getStudioInstance().studioConnectionsManager.waitForConnection({
						connectionType: projectEntry.remoteProjectConnectionType,
						projectUuid: projectEntry.remoteProjectUuid,
					});
					getStudioInstance().studioConnectionsManager.requestConnection(connection.id);
				},
			});
		} else {
			const castEntry = /** @type {StoredProjectEntryAny} */ (projectEntry);
			throw new Error(`Unknown file system type: "${castEntry.fileSystemType}".`);
		}
	}

	/**
	 * Registers a callback that gets fired whenever a file or folder of the current
	 * project is changed. This callback will keep working when switching between projects.
	 * You can use this instead of `onChange` on the {@linkcode currentProjectFileSystem},
	 * that way you don't have to keep registering a new callback whenever the current project changes.
	 * @param {import("../util/fileSystems/StudioFileSystem.js").FileSystemChangeCallback} cb
	 */
	onFileChange(cb) {
		this.#onFileChangeCbs.add(cb);
	}

	/**
	 * @param {import("../util/fileSystems/StudioFileSystem.js").FileSystemChangeCallback} cb
	 */
	removeOnFileChange(cb) {
		this.#onFileChangeCbs.delete(cb);
	}

	suggestCheckExternalChanges() {
		if (this.currentProjectFileSystem) {
			this.currentProjectFileSystem.suggestCheckExternalChanges();
		}
	}

	/**
	 * @returns {import("../../../src/network/studioConnections/DiscoveryManager.js").AvailableConnectionProjectMetadata?}
	 */
	getCurrentProjectMetadata() {
		if (!this.#currentProjectOpenEvent) return null;
		return {
			name: this.#currentProjectOpenEvent.name,
			uuid: this.#currentProjectOpenEvent.projectUuid,
			fileSystemHasWritePermissions: this.#rootHasWritePermissions,
		};
	}
}
