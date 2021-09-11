import IndexedDbUtil from "../Util/IndexedDbUtil.js";

/**
 * @typedef {Object} WorkspaceData
 * @property {WorkspaceDataWindow} rootWindow
 * @property {boolean} [autosaveWorkspace=true]
 */

/**
 * @typedef {Object} WorkspaceDataWindow
 * @property {"split" | "tabs"} type
 */

/**
 * @typedef {Object} WorkspaceDataWindowSplitType
 * @property {boolean} splitHorizontal
 * @property {number} splitPercentage
 * @property {WorkspaceDataWindow} windowA
 * @property {WorkspaceDataWindow} windowB
 *
 * @typedef {WorkspaceDataWindow & WorkspaceDataWindowSplitType} WorkspaceDataWindowSplit
 */

/**
 * @typedef {Object} WorkspaceDataWindowTabsType
 * @property {Array<string>} tabTypes
 * @property {number} [activeTabIndex]
 *
 * @typedef {WorkspaceDataWindow & WorkspaceDataWindowTabsType} WorkspaceDataWindowTabs
 */

export default class WorkspaceManager {
	constructor() {
		this.indexedDb = new IndexedDbUtil("workspaces", ["workspaces", "workspaceSettings"]);

		this.currentWorkSpaceIdCache = null;
		/** @type {Set<function() : void>} */
		this.onCurrentWorkspaceIdChangeCbs = new Set();
	}

	/** @returns {Promise<Array<string>>} */
	async getWorkspacesList() {
		const list = await this.indexedDb.get("workspaces", "workspaceSettings");
		if (!list || list.length <= 0) return ["Default"];
		return list;
	}

	/**
	 * @param {Array<string>} value
	 */
	async setWorkspacesList(value) {
		await this.indexedDb.set("workspaces", value, "workspaceSettings");
	}

	/** @returns {Promise<string>} */
	async getCurrentWorkspaceId() {
		if (this.currentWorkSpaceIdCache) return this.currentWorkSpaceIdCache;

		this.currentWorkSpaceIdCache = await this.indexedDb.get("currentWorkspaceId", "workspaceSettings");
		if (!this.currentWorkSpaceIdCache) this.currentWorkSpaceIdCache = "Default";
		return this.currentWorkSpaceIdCache;
	}

	/**
	 * @param {string} id
	 */
	async setCurrentWorkspaceId(id) {
		this.currentWorkSpaceIdCache = id;
		for (const cb of this.onCurrentWorkspaceIdChangeCbs) {
			cb();
		}
		await this.indexedDb.set("currentWorkspaceId", id, "workspaceSettings");
	}

	/**
	 * @param {function() : void} cb
	 */
	onCurrentWorkspaceIdChange(cb) {
		this.onCurrentWorkspaceIdChangeCbs.add(cb);
	}

	/**
	 * @param {string} workspaceId
	 * @returns {Promise<WorkspaceData>}
	 */
	async getWorkspace(workspaceId) {
		const workspaceData = await this.indexedDb.get(workspaceId, "workspaces");
		if (!workspaceData) return this.getDefaultWorkspace();
		return workspaceData;
	}

	/** @returns {Promise<WorkspaceData>} */
	async getCurrentWorkspace() {
		return await this.getWorkspace(await this.getCurrentWorkspaceId());
	}

	/**
	 * @param {WorkspaceData} workspaceData
	 */
	async saveCurrentWorkspace(workspaceData) {
		await this.saveWorkspace(await this.getCurrentWorkspaceId(), workspaceData);
	}

	/**
	 * @param {string} workspaceId
	 * @param {WorkspaceData} workspaceData
	 */
	async saveWorkspace(workspaceId, workspaceData) {
		await this.indexedDb.set(workspaceId, workspaceData, "workspaces");
	}

	/**
	 * @param {string} name
	 */
	async addNewWorkspace(name) {
		const list = await this.getWorkspacesList();
		list.push(name);
		await this.setWorkspacesList(list);
		const previousId = await this.getCurrentWorkspaceId();
		const currentData = await this.getCurrentWorkspace();
		await this.setCurrentWorkspaceId(name);
		await this.saveWorkspace(previousId, currentData);
	}

	async deleteCurrentWorkspace() {
		const list = await this.getWorkspacesList();
		if (list.length <= 1) {
			throw new Error("Cannot delete workspace when it's the only one");
		}
		const currentWorkspace = await this.getCurrentWorkspaceId();
		const newList = list.filter((id) => id != currentWorkspace);
		await this.setWorkspacesList(newList);
		await this.setCurrentWorkspaceId(newList[0]); // todo: update windowmanager workspace
	}

	async getAutoSaveValue() {
		const data = await this.getCurrentWorkspace();
		return data?.autosaveWorkspace ?? true;
	}

	/**
	 * @param {boolean} value
	 */
	async setAutoSaveValue(value) {
		const workspaceData = await this.getCurrentWorkspace();
		workspaceData.autosaveWorkspace = value;
		await this.indexedDb.set(await this.getCurrentWorkspaceId(), workspaceData, "workspaces");
	}

	/**
	 * @returns {WorkspaceData}
	 */
	getDefaultWorkspace() {
		return {
			/** @type {WorkspaceDataWindowSplit} */
			rootWindow: {
				type: "split",
				splitHorizontal: false,
				splitPercentage: 0.25,
				/** @type {WorkspaceDataWindowSplit} */
				windowA: {
					type: "split",
					splitHorizontal: true,
					splitPercentage: 0.6,
					/** @type {WorkspaceDataWindowTabs} */
					windowA: {
						type: "tabs",
						tabTypes: ["outliner", "defaultAssetLinks"],
					},
					/** @type {WorkspaceDataWindowTabs} */
					windowB: {
						type: "tabs",
						tabTypes: ["project", "builtInAssets"],
					},
				},
				/** @type {WorkspaceDataWindowSplit} */
				windowB: {
					type: "split",
					splitHorizontal: false,
					splitPercentage: 0.6,
					/** @type {WorkspaceDataWindowSplit} */
					windowA: {
						type: "split",
						splitHorizontal: true,
						splitPercentage: 0.5,
						/** @type {WorkspaceDataWindowTabs} */
						windowA: {
							type: "tabs",
							tabTypes: ["entityEditor"],
						},
						/** @type {WorkspaceDataWindowTabs} */
						windowB: {
							type: "tabs",
							tabTypes: ["buildView"],
						},
					},
					/** @type {WorkspaceDataWindowTabs} */
					windowB: {
						type: "tabs",
						tabTypes: ["properties"],
					},
				},
			},
		};
	}
}
