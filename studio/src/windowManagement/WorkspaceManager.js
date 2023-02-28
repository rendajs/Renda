import {IndexedDbUtil} from "../../../src/util/IndexedDbUtil.js";

/**
 * @typedef {object} WorkspaceData
 * @property {WorkspaceDataWindow} rootWindow
 * @property {boolean} [autosaveWorkspace=true]
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
	/** @type {Set<function() : void>} */
	#onActiveWorkspaceDataChangeCbs = new Set();
	/** @type {WorkspaceData?} */
	#activeWorkspaceData = null;

	constructor() {
		this.indexedDb = new IndexedDbUtil("workspaces", {
			objectStoreNames: [WORKSPACES_OBJECT_STORE_NAME, WORKSPACE_SETTINGS_OBJECT_STORE_NAME],
		});
	}

	async getWorkspacesList() {
		/** @type {typeof this.indexedDb.get<string[]>} */
		const getWorkspaces = this.indexedDb.get.bind(this.indexedDb);
		const list = await getWorkspaces(WORKSPACES_KEY, WORKSPACE_SETTINGS_OBJECT_STORE_NAME);
		if (!list || list.length <= 0) return ["Default"];
		return list;
	}

	/**
	 * @param {string[]} value
	 */
	async #setWorkspacesList(value) {
		await this.indexedDb.set(WORKSPACES_KEY, value, WORKSPACE_SETTINGS_OBJECT_STORE_NAME);
	}

	async getCurrentWorkspaceId() {
		if (this.#activeWorkSpaceId) return this.#activeWorkSpaceId;

		/** @type {typeof this.indexedDb.get<string>} */
		const getWorkspaceId = this.indexedDb.get.bind(this.indexedDb);
		this.#activeWorkSpaceId = await getWorkspaceId(CURRENT_WORKSPACE_ID_KEY, WORKSPACE_SETTINGS_OBJECT_STORE_NAME) || null;
		if (!this.#activeWorkSpaceId) this.#activeWorkSpaceId = "Default";
		return this.#activeWorkSpaceId;
	}

	/**
	 * @param {string} id
	 */
	async setCurrentWorkspaceId(id) {
		this.#activeWorkSpaceId = id;
		await this.indexedDb.set(CURRENT_WORKSPACE_ID_KEY, id, WORKSPACE_SETTINGS_OBJECT_STORE_NAME);
		this.revertCurrentWorkspace();
	}

	/**
	 * @param {function() : void} cb
	 */
	onActiveWorkspaceDataChange(cb) {
		this.#onActiveWorkspaceDataChangeCbs.add(cb);
	}

	/**
	 * Active workspace data is the state of the workspace that is persisted across sessions.
	 * This is not necessarily the same as the currently saved workspace, since it is possible for the user to
	 * disable autosave and then make adjustments to the workspace.
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
	 * @param {string} workspaceId
	 */
	async #getWorkspaceData(workspaceId) {
		/** @type {typeof this.indexedDb.get<WorkspaceData>} */
		const dbGetWorkspace = this.indexedDb.get.bind(this.indexedDb);
		const workspaceData = await dbGetWorkspace(workspaceId, WORKSPACES_OBJECT_STORE_NAME);
		if (!workspaceData) return this.getDefaultWorkspace();
		return workspaceData;
	}

	/**
	 * @param {WorkspaceDataWindow} rootWindow
	 */
	async saveActiveWorkspaceWindows(rootWindow) {
		const workspaceData = await this.getActiveWorkspaceData();
		workspaceData.rootWindow = rootWindow;
		await this.#saveActiveWorkspace();
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

	async #saveActiveWorkspace() {
		if (this.#activeWorkspaceData) {
			await this.indexedDb.set(ACTIVE_WORKSPACE_KEY, this.#activeWorkspaceData, WORKSPACE_SETTINGS_OBJECT_STORE_NAME);
			if (await this.getCurrentWorkspaceAutoSaveValue()) {
				const currentWorkspaceData = await this.#getCurrentWorkspaceData();
				currentWorkspaceData.rootWindow = this.#activeWorkspaceData.rootWindow;
				await this.#saveCurrentWorkspace(currentWorkspaceData);
			}
		}
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
			throw new Error("Cannot delete workspace when it's the only one");
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
						tabTypes: ["outliner", "defaultAssetLinks"],
						tabUuids: ["065116de-2e58-4391-b97f-f91187c2ee73", "2136a06a-80e5-40a4-ba60-ec9dac36a3bb"],
					},
					windowB: {
						type: "tabs",
						tabTypes: ["project", "builtInAssets"],
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
							tabTypes: ["entityEditor"],
							tabUuids: ["c32f1b01-a76e-4124-adcb-e972a9ace63f"],
						},
						windowB: {
							type: "tabs",
							tabTypes: ["buildView"],
							tabUuids: ["06b33121-13c9-42e2-82c9-82796f448c30"],
						},
					},
					windowB: {
						type: "tabs",
						tabTypes: ["properties"],
						tabUuids: ["6b534a19-eb78-40f1-aea8-652535aafb96"],
					},
				},
			},
		};
		return defaultWorkspace;
	}
}
