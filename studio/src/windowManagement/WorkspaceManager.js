import {IndexedDbUtil} from "../../../src/util/IndexedDbUtil.js";

/**
 * @typedef {object} WorkspaceData
 * @property {WorkspaceDataWindow} rootWindow
 * @property {boolean} [autosaveWorkspace=true]
 * @property {WorkspacePreferencesData} [preferences]
 */

/**
 * @typedef WorkspacePreferencesData
 * @property {import("../preferences/preferencesLocation/PreferencesLocation.js").PreferencesData} workspace
 * @property {WorkspaceWindowPreferencesData[]} windows
 */
/**
 * @typedef WorkspaceWindowPreferencesData
 * @property {import("../../../src/mod.js").UuidString} uuid
 * @property {import("../preferences/preferencesLocation/PreferencesLocation.js").PreferencesData} preferences
 */

/**
 * @typedef {object} WorkspaceDataWindowSplit
 * @property {"split"} type
 * @property {boolean} splitHorizontal
 * @property {number} splitPercentage
 * @property {WorkspaceDataWindow?} windowA
 * @property {WorkspaceDataWindow?} windowB
 */

/**
 * @typedef {object} WorkspaceDataWindowTabs
 * @property {"tabs"} type
 * @property {string[]} tabTypes
 * @property {import("../../../src/util/mod.js").UuidString[]} tabUuids
 * @property {number} [activeTabIndex]
 */

/**
 * @typedef {WorkspaceDataWindowSplit | WorkspaceDataWindowTabs} WorkspaceDataWindow
 */

const WORKSPACE_SETTINGS_OBJECT_STORE_NAME = "workspaceSettings";
const WORKSPACES_OBJECT_STORE_NAME = "workspaces";
const ACTIVE_WORKSPACE_KEY = "activeWorkspace";
const WORKSPACES_KEY = "workspaces";
const CURRENT_WORKSPACE_ID_KEY = "currentWorkspaceId";

export class WorkspaceManager {
	/** @type {string?} */
	#activeWorkSpaceId = null;
	/** @type {Set<() => void>} */
	#onActiveWorkspaceDataChangeCbs = new Set();
	/** @type {WorkspaceData?} */
	#activeWorkspaceData = null;

	/**
	 * This class is responsible for managing workspaces and storing them in an IndexedDb
	 * so that it can be persisted across sessions.
	 *
	 * The WorkspaceManager has two concepts that should not be mixed up:
	 * - The **active workspace** is the workspace that the user is currently seeing on the screen.
	 * any adjustment that is made is immediately saved regardless of the 'autosave' state.
	 * This means that refreshing the page will always show the same state as when the page was closed.
	 * - The **current workspace** is the workspace that is currently selected and
	 * marked with a checkmark in the workspaces list. This data is *not* saved with every
	 * change that is made, unless 'autosave' is enabled.
	 */
	constructor() {
		this.indexedDb = new IndexedDbUtil("workspaces", {
			objectStoreNames: [WORKSPACES_OBJECT_STORE_NAME, WORKSPACE_SETTINGS_OBJECT_STORE_NAME],
		});
	}

	/**
	 * Returns the names of available workspaces from the IndexedDb.
	 */
	async getWorkspacesList() {
		/** @type {typeof this.indexedDb.get<string[]>} */
		const getWorkspaces = this.indexedDb.get.bind(this.indexedDb);
		const list = await getWorkspaces(WORKSPACES_KEY, WORKSPACE_SETTINGS_OBJECT_STORE_NAME);
		if (!list || list.length <= 0) return ["Default"];
		return list;
	}

	/**
	 * Stores the names of available workspaces in the IndexedDb.
	 * @param {string[]} value
	 */
	async #setWorkspacesList(value) {
		await this.indexedDb.set(WORKSPACES_KEY, value, WORKSPACE_SETTINGS_OBJECT_STORE_NAME);
	}

	/**
	 * Returns the name of the currently selected workspace as stored in the IndexedDb.
	 */
	async getCurrentWorkspaceId() {
		if (this.#activeWorkSpaceId) return this.#activeWorkSpaceId;

		/** @type {typeof this.indexedDb.get<string>} */
		const getWorkspaceId = this.indexedDb.get.bind(this.indexedDb);
		this.#activeWorkSpaceId = await getWorkspaceId(CURRENT_WORKSPACE_ID_KEY, WORKSPACE_SETTINGS_OBJECT_STORE_NAME) || null;
		if (!this.#activeWorkSpaceId) this.#activeWorkSpaceId = "Default";
		return this.#activeWorkSpaceId;
	}

	/**
	 * Sets the name of the currently selected workspace and stores it in the IndexedDb.
	 * @param {string} id
	 */
	async setCurrentWorkspaceId(id) {
		if (this.#activeWorkSpaceId == id) return;
		this.#activeWorkSpaceId = id;
		await this.indexedDb.set(CURRENT_WORKSPACE_ID_KEY, id, WORKSPACE_SETTINGS_OBJECT_STORE_NAME);
		await this.revertCurrentWorkspace();
	}

	/**
	 * Registers a callback that fires when the active workspace data has changed and the workspace should be reloaded.
	 * This fires when the user switches to a different workspace
	 * or reverts the current workspace to an earlier state for instance.
	 * @param {() => void} cb
	 */
	onActiveWorkspaceDataChange(cb) {
		this.#onActiveWorkspaceDataChangeCbs.add(cb);
	}

	/**
	 * Active workspace data is the state of the workspace that is persisted across sessions.
	 * This is not necessarily the same as the currently saved workspace, since it is possible for the user to
	 * disable autosave and then make adjustments to the workspace.
	 * This essentially returns the active workspace data as stored in the IndexedDb,
	 * but subsequent calls return a cached value from memory.
	 * @returns {Promise<WorkspaceData>}
	 */
	async getActiveWorkspaceData() {
		if (!this.#activeWorkspaceData) {
			/** @type {typeof this.indexedDb.get<WorkspaceData>} */
			const dbGetWorkspace = this.indexedDb.get.bind(this.indexedDb);
			let workspaceData = await dbGetWorkspace(ACTIVE_WORKSPACE_KEY, WORKSPACE_SETTINGS_OBJECT_STORE_NAME);
			if (!workspaceData) {
				workspaceData = await this.#getCurrentWorkspaceData();
			}
			this.#activeWorkspaceData = workspaceData;
			delete this.#activeWorkspaceData.autosaveWorkspace;
		}
		return this.#activeWorkspaceData;
	}

	/**
	 * Stores serialized workspacedata to the IndexedDb.
	 * @param {WorkspaceDataWindow} rootWindow
	 * @param {WorkspacePreferencesData} preferences
	 */
	async setActiveWorkspaceData(rootWindow, preferences) {
		const workspaceData = await this.getActiveWorkspaceData();
		workspaceData.rootWindow = rootWindow;
		workspaceData.preferences = preferences;
		if (preferences.windows.length == 0 && Object.values(preferences.workspace).length == 0) {
			delete workspaceData.preferences;
		}
		await this.#saveActiveWorkspace();
	}

	/**
	 * Stores the workspace data that is held in memory to active workspace in the IndexedDb.
	 * Also writes to the current workspace if autosave is enabled for this workspace.
	 */
	async #saveActiveWorkspace() {
		if (this.#activeWorkspaceData) {
			await this.indexedDb.set(ACTIVE_WORKSPACE_KEY, this.#activeWorkspaceData, WORKSPACE_SETTINGS_OBJECT_STORE_NAME);
			if (await this.getCurrentWorkspaceAutoSaveValue()) {
				const currentWorkspaceData = await this.#getCurrentWorkspaceData();
				currentWorkspaceData.rootWindow = this.#activeWorkspaceData.rootWindow;
				if (this.#activeWorkspaceData.preferences) {
					currentWorkspaceData.preferences = this.#activeWorkspaceData.preferences;
				} else {
					delete currentWorkspaceData.preferences;
				}
				await this.#saveCurrentWorkspace(currentWorkspaceData);
			}
		}
	}

	/**
	 * Returns the current workspace as it is saved in the list of workspaces.
	 * This is not necessarily the same as the active workspace data, since it is possible for the user to
	 * disable autosave and then make adjustments to the workspace.
	 * @returns {Promise<WorkspaceData>}
	 */
	async #getCurrentWorkspaceData() {
		const workspaceId = await this.getCurrentWorkspaceId();
		return this.#getWorkspaceData(workspaceId);
	}

	/**
	 * Gets workspace data from a specific workspace id.
	 * @param {string} workspaceId
	 */
	async #getWorkspaceData(workspaceId) {
		/** @type {typeof this.indexedDb.get<WorkspaceData>} */
		const dbGetWorkspace = this.indexedDb.get.bind(this.indexedDb);
		const workspaceData = await dbGetWorkspace(workspaceId, WORKSPACES_OBJECT_STORE_NAME);
		if (!workspaceData) return this.getDefaultWorkspace();
		return workspaceData;
	}

	async getCurrentWorkspaceAutoSaveValue() {
		const workspaceData = await this.#getCurrentWorkspaceData();
		return workspaceData.autosaveWorkspace ?? true;
	}

	/**
	 * @param {boolean} value
	 */
	async setCurrentWorkspaceAutoSaveValue(value) {
		const workspaceData = await this.#getCurrentWorkspaceData();
		workspaceData.autosaveWorkspace = value;
		await this.#saveCurrentWorkspace(workspaceData);
	}

	/**
	 * @param {WorkspaceData} workspaceData
	 */
	async #saveCurrentWorkspace(workspaceData) {
		await this.#saveWorkspace(await this.getCurrentWorkspaceId(), workspaceData);
	}

	/**
	 * @param {string} workspaceId
	 * @param {WorkspaceData} workspaceData
	 */
	async #saveWorkspace(workspaceId, workspaceData) {
		await this.indexedDb.set(workspaceId, workspaceData, WORKSPACES_OBJECT_STORE_NAME);
	}

	/**
	 * @param {string} name
	 */
	async addNewWorkspace(name) {
		const list = await this.getWorkspacesList();
		if (list.includes(name)) {
			throw new Error(`A workspace with the name "${name}" already exists.`);
		}
		list.push(name);
		await this.#setWorkspacesList(list);
		await this.setCurrentWorkspaceId(name);
	}

	/**
	 * @param {string} workspaceId The workspace to clone.
	 */
	async cloneWorkspace(workspaceId) {
		const newName = prompt("Enter Workspace Name", `Copy of ${workspaceId}`);
		const list = await this.getWorkspacesList();
		if (!newName) return;

		if (list.includes(newName)) {
			throw new Error(`A workspace with the name "${newName}" already exists.`);
		}
		list.push(newName);
		await this.#setWorkspacesList(list);
		const previousWorkspaceData = await this.#getWorkspaceData(workspaceId);
		await this.#saveWorkspace(newName, previousWorkspaceData);
		await this.setCurrentWorkspaceId(newName);
	}

	/**
	 * @param {string} workspaceId
	 */
	async deleteWorkspace(workspaceId) {
		const list = await this.getWorkspacesList();
		if (list.length <= 1) {
			throw new Error("Cannot delete workspace when it's the only one.");
		}
		const newList = list.filter(id => id != workspaceId);
		await this.#setWorkspacesList(newList);
		await this.indexedDb.delete(workspaceId, WORKSPACES_OBJECT_STORE_NAME);
		await this.setCurrentWorkspaceId(newList[0]);
	}

	async revertCurrentWorkspace() {
		this.#activeWorkspaceData = await this.#getCurrentWorkspaceData();
		delete this.#activeWorkspaceData.autosaveWorkspace;
		this.#onActiveWorkspaceDataChangeCbs.forEach(cb => cb());
		await this.#saveActiveWorkspace();
	}

	getDefaultWorkspace() {
		/** @type {WorkspaceData} */
		const defaultWorkspace = {
			rootWindow: {
				type: "split",
				splitHorizontal: false,
				splitPercentage: 0.25,
				windowA: {
					type: "split",
					splitHorizontal: true,
					splitPercentage: 0.6,
					windowA: {
						type: "tabs",
						tabTypes: ["renda:outliner", "renda:defaultAssetLinks"],
						tabUuids: ["065116de-2e58-4391-b97f-f91187c2ee73", "2136a06a-80e5-40a4-ba60-ec9dac36a3bb"],
					},
					windowB: {
						type: "tabs",
						tabTypes: ["renda:project", "renda:builtInAssets"],
						tabUuids: ["9a231e9a-e3ab-436f-9ebc-2c6f58c64428", "9b8ca89c-c4be-4352-adcf-faf5d40821d0"],
					},
				},
				windowB: {
					type: "split",
					splitHorizontal: false,
					splitPercentage: 0.6,
					windowA: {
						type: "split",
						splitHorizontal: true,
						splitPercentage: 0.5,
						windowA: {
							type: "tabs",
							tabTypes: ["renda:entityEditor"],
							tabUuids: ["c32f1b01-a76e-4124-adcb-e972a9ace63f"],
						},
						windowB: {
							type: "tabs",
							tabTypes: ["renda:buildView"],
							tabUuids: ["06b33121-13c9-42e2-82c9-82796f448c30"],
						},
					},
					windowB: {
						type: "tabs",
						tabTypes: ["renda:properties"],
						tabUuids: ["6b534a19-eb78-40f1-aea8-652535aafb96"],
					},
				},
			},
		};
		return defaultWorkspace;
	}
}
