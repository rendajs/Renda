import IndexedDbUtil from "../Util/IndexedDbUtil.js";

/**
 * @typedef {Object} WorkspaceData
 * @property {WorkspaceDataWindow} rootWindow
 */

/**
 * @typedef {Object} WorkspaceDataWindow
 * @property {string} type
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
	}

	/** @returns {Promise<Array<string>>} */
	async getWorkspacesList() {
		const list = await this.indexedDb.get("workspaces", "workspaceSettings");
		if (!list || list.length <= 0) return ["Default"];
		return list;
	}

	/** @returns {Promise<string>} */
	async getCurrentWorkspaceId() {
		const id = await this.indexedDb.get("currentWorkspaceId", "workspaceSettings");
		if (!id) return "Default";
		return id;
	}

	/**
	 * @param {string} id
	 */
	async setCurrentWorkspaceId(id) {
		await this.indexedDb.set("currentWorkspaceId", id, "workspaceSettings");
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
	 * @param {WorkspaceData} workspaceData
	 */
	async saveCurrentWorkspace(workspaceData) {
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
				}
			}
		}
	}
}
