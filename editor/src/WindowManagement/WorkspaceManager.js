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
 * @property {string[]} tabTypes
 * @property {import("../Util/Util.js").UuidString[]} tabUuids
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

	/**
	 * @returns {Promise<Array<string>>}
	 */
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

	/**
	 * @returns {Promise<string>}
	 */
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

	/**
	 * @returns {Promise<WorkspaceData>}
	 */
	async getCurrentWorkspace() {
		return await this.getWorkspace(await this.getCurrentWorkspaceId());
	}

	/**
	 * @param {WorkspaceData} workspaceData
	 */
	async saveCurrentWorkspace(workspaceData) {
		const newWorkspaceData = {
			autosaveWorkspace: await this.getAutoSaveValue(),
			...workspaceData,
		};
		await this.saveWorkspace(await this.getCurrentWorkspaceId(), newWorkspaceData);
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
		const newList = list.filter(id => id != currentWorkspace);
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
		await this.saveCurrentWorkspace(workspaceData);
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
						tabUuids: ["065116de-2e58-4391-b97f-f91187c2ee73", "2136a06a-80e5-40a4-ba60-ec9dac36a3bb"],
					},
					/** @type {WorkspaceDataWindowTabs} */
					windowB: {
						type: "tabs",
						tabTypes: ["project", "builtInAssets"],
						tabUuids: ["9a231e9a-e3ab-436f-9ebc-2c6f58c64428", "9b8ca89c-c4be-4352-adcf-faf5d40821d0"],
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
							tabUuids: ["c32f1b01-a76e-4124-adcb-e972a9ace63f"],
						},
						/** @type {WorkspaceDataWindowTabs} */
						windowB: {
							type: "tabs",
							tabTypes: ["buildView"],
							tabUuids: ["06b33121-13c9-42e2-82c9-82796f448c30"],
						},
					},
					/** @type {WorkspaceDataWindowTabs} */
					windowB: {
						type: "tabs",
						tabTypes: ["properties"],
						tabUuids: ["6b534a19-eb78-40f1-aea8-652535aafb96"],
					},
				},
			},
		};
	}
}
