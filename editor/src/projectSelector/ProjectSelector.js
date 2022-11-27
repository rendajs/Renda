import {IndexedDbUtil} from "../../../src/util/IndexedDbUtil.js";
import {PromiseWaitHelper} from "../../../src/util/PromiseWaitHelper.js";
import {IndexedDbEditorFileSystem} from "../util/fileSystems/IndexedDbEditorFileSystem.js";

export class ProjectSelector {
	/** @typedef {import("./ProjectManager.js").StoredProjectEntryAny} StoredProjectEntryAny */

	constructor() {
		this.visible = true;
		this.loadedEditor = null;
		/** @type {Set<(editor: import("../Editor.js").Editor) => void>} */
		this.onEditorLoadCbs = new Set();

		this.indexedDb = new IndexedDbUtil("projectSelector");

		this.curtainEl = document.createElement("div");
		this.curtainEl.classList.add("project-selector-curtain");
		this.curtainEl.addEventListener("click", () => this.setVisibility(false));
		document.body.appendChild(this.curtainEl);

		this.el = document.createElement("div");
		this.el.classList.add("project-selector-window");
		document.body.appendChild(this.el);

		const headerEl = document.createElement("div");
		headerEl.classList.add("project-selector-header");
		this.el.appendChild(headerEl);

		const logoEl = document.createElement("div");
		logoEl.classList.add("project-selector-logo");
		headerEl.appendChild(logoEl);

		const titleEl = document.createElement("h1");
		titleEl.classList.add("project-selector-title");
		titleEl.textContent = "Renda";
		headerEl.appendChild(titleEl);

		this.actionsListEl = this.createList("actions", "Start");
		this.recentListEl = this.createList("recent", "Recent");

		this.shouldOpenEmptyOnLoad = true;
		/**
		 * A value that becomes false once an empty project is loaded in the background.
		 * This is to prevent an empty project from being loaded twice.
		 * This value becomes true again once the project selector becomes visible a second time.
		 */
		this.allowOpeningNew = true;

		this.createAction("New Project", async () => {
			if (this.allowOpeningNew) {
				this.willOpenProjectAfterLoad();
				const editor = await this.waitForEditor();
				editor.projectManager.openNewDbProject(true);
			}
			this.setVisibility(false);
		});
		this.createAction("Open Project", async () => {
			this.willOpenProjectAfterLoad();
			const editor = await this.waitForEditor();
			editor.projectManager.openProjectFromLocalDirectory();
			this.setVisibility(false);
		});
		this.createAction("Connect Remote Project", async () => {
			this.willOpenProjectAfterLoad();
			const editor = await this.waitForEditor();
			editor.projectManager.openNewRemoteProject(true);
			this.setVisibility(false);
		});

		/** @type {StoredProjectEntryAny[]?} */
		this.recentProjectsList = null;
		this.getRecentsWaiter = new PromiseWaitHelper();

		this.isRunningAddRecentProjects = false;
		/** @type {StoredProjectEntryAny[]} */
		this.addRecentProjectsQueue = [];

		this.startGetRecentProjects();
		this.updateRecentProjectsUi();
		this.deleteProjectsNotWorthSaving();
		this.openMostRecentProject();
	}

	/**
	 * @param {string} name
	 * @param {string} title
	 */
	createList(name, title) {
		const containerEl = document.createElement("div");
		containerEl.classList.add(`project-selector-${name}-list-container`, "project-selector-list-container");
		this.el.appendChild(containerEl);

		const titleEl = document.createElement("h4");
		titleEl.textContent = title;
		containerEl.appendChild(titleEl);

		const listEl = document.createElement("ul");
		listEl.classList.add("project-selector-list");
		containerEl.appendChild(listEl);

		return listEl;
	}

	/**
	 * @param {string} name
	 * @param {function() : void} onClick
	 */
	createAction(name, onClick) {
		this.createListButton(this.actionsListEl, name, onClick);
	}

	/**
	 * @param {HTMLUListElement} listEl
	 * @param {string} name
	 * @param {function() : void} onClick
	 */
	createListButton(listEl, name, onClick) {
		const item = document.createElement("li");
		item.classList.add("project-selector-button");
		item.textContent = name;
		item.addEventListener("click", onClick);
		listEl.appendChild(item);
		return item;
	}

	async startGetRecentProjects() {
		this.recentProjectsList = await this.indexedDb.get("recentProjectsList");
		if (!this.recentProjectsList) this.recentProjectsList = [];
		const databases = await indexedDB.databases();
		const databaseNames = databases.map(db => db.name);
		this.recentProjectsList = this.recentProjectsList.filter(entry => {
			if (entry.fileSystemType != "db") return true;

			const dbName = IndexedDbEditorFileSystem.getDbName(entry.projectUuid);
			return databaseNames.includes(dbName);
		});
		this.getRecentsWaiter.fire();
	}

	/**
	 * @returns {Promise<StoredProjectEntryAny[]>}
	 */
	async getRecentProjects() {
		await this.getRecentsWaiter.wait();
		if (!this.recentProjectsList) {
			throw new Error("Failed to initialize recent projects list.");
		}
		return this.recentProjectsList;
	}

	async saveRecentProjects() {
		await this.indexedDb.set("recentProjectsList", this.recentProjectsList);
		if (this.visible) {
			await this.updateRecentProjectsUi();
		}
	}

	async updateRecentProjectsUi() {
		const list = await this.getRecentProjects();

		while (this.recentListEl.firstChild) {
			this.recentListEl.removeChild(this.recentListEl.firstChild);
		}

		for (const entry of list) {
			if (!entry.isWorthSaving) continue;
			let text = entry.name;
			if (entry.alias) {
				text = entry.alias;
			}
			const el = this.createListButton(this.recentListEl, text, async () => {
				this.willOpenProjectAfterLoad();
				const editor = await this.waitForEditor();
				editor.projectManager.openExistingProject(entry, true);
				this.setVisibility(false);
			});
			let tooltip = "";
			if (entry.fileSystemType == "fsa") {
				tooltip = "File System on Disk";
			} else if (entry.fileSystemType == "db") {
				tooltip = "Stored in Cookies";
			} else if (entry.fileSystemType == "remote") {
				tooltip = "Remote File System";
				if (entry.remoteProjectConnectionType == "internal") {
					tooltip += " (Internal Connection)";
				} else if (entry.remoteProjectConnectionType == "webRtc") {
					tooltip += " (WebRTC Connection)";
				}
			}
			el.title = tooltip;
			el.addEventListener("contextmenu", async e => {
				if (this.loadedEditor) {
					e.preventDefault();
					let deleteText = "Remove from Recents";
					if (entry.fileSystemType == "db") {
						deleteText = "Delete";
					}
					const contextMenu = await this.loadedEditor.popoverManager.createContextMenu([
						{
							text: "Change Alias",
							onClick: async () => {
								const alias = prompt("New Alias", entry.name);
								if (alias) {
									await this.setRecentProjectAlias(entry, alias);
								}
							},
						},
						{
							text: deleteText,
							onClick: async () => {
								if (entry.fileSystemType == "db") {
									if (entry.isWorthSaving) {
										const promptResult = confirm("Deleting this project can not be undone. Are you sure?");
										if (!promptResult) return;
									}
									const editor = await this.waitForEditor();
									await editor.projectManager.deleteDbProject(entry);
								}
								this.removeRecentProjectsEntry(entry);
							},
						},
					]);
					contextMenu.setPos(e);
				}
			});
		}
	}

	async openMostRecentProject() {
		const list = await this.getRecentProjects();
		for (const entry of list) {
			if (!entry.isWorthSaving) continue;
			this.willOpenProjectAfterLoad();
			const editor = await this.waitForEditor();
			editor.projectManager.openExistingProject(entry, false);
			this.setVisibility(false);
			return;
		}
	}

	/**
	 * @returns {Promise<import("../Editor.js").Editor>}
	 */
	async waitForEditor() {
		if (this.loadedEditor) return this.loadedEditor;

		return new Promise(r => this.onEditorLoadCbs.add(r));
	}

	/**
	 * By default an empty project is loaded once the editor is ready. However,
	 * to prevent the overhead of creating a new project you can call this if you
	 * are certain opening of a project on load has already been handled elsewhere.
	 */
	willOpenProjectAfterLoad() {
		this.shouldOpenEmptyOnLoad = false;
	}

	/**
	 * @param {import("../Editor.js").Editor} editor
	 */
	setEditorLoaded(editor) {
		this.loadedEditor = editor;
		editor.projectManager.onProjectOpenEntryChange(entry => {
			this.addRecentProjectEntry(entry);
		});
		if (this.shouldOpenEmptyOnLoad) {
			editor.projectManager.openNewDbProject(false);
			this.allowOpeningNew = false;
		}
		this.onEditorLoadCbs.forEach(cb => cb(editor));
	}

	async deleteProjectsNotWorthSaving() {
		const editor = await this.waitForEditor();
		const recentProjects = await this.getRecentProjects();
		const promises = [];
		for (const entry of recentProjects) {
			if (!entry.isWorthSaving && !editor.projectManager.isCurrentProjectEntry(entry)) {
				const promise = (async () => {
					await editor.projectManager.deleteDbProject(entry);
					this.removeRecentProjectsEntry(entry);
				})();
				promises.push(promise);
			}
		}
		await Promise.all(promises);
	}

	/**
	 * @param {StoredProjectEntryAny} entry
	 */
	async addRecentProjectEntry(entry) {
		this.addRecentProjectsQueue.push(entry);
		if (this.isRunningAddRecentProjects) return;

		this.isRunningAddRecentProjects = true;
		while (this.addRecentProjectsQueue.length > 0) {
			const entry = this.addRecentProjectsQueue.shift();
			if (!entry) break;
			const newList = await this.removeProjectEntryFromList(entry);
			newList.unshift(entry);
		}
		await this.saveRecentProjects();
		this.isRunningAddRecentProjects = false;
	}

	/**
	 * @param {StoredProjectEntryAny} entry
	 */
	async removeRecentProjectsEntry(entry) {
		await this.removeProjectEntryFromList(entry);
		await this.saveRecentProjects();
	}

	/**
	 * @param {StoredProjectEntryAny} entry
	 * @param {string} alias
	 */
	async setRecentProjectAlias(entry, alias) {
		const list = await this.getRecentProjects();
		const promises = [];
		for (const existingEntry of list) {
			const promise = (async () => {
				if (await this.projectEntryEquals(entry, existingEntry)) {
					existingEntry.alias = alias;
				}
			})();
			promises.push(promise);
		}
		await Promise.allSettled(promises);
		await this.saveRecentProjects();
	}

	/**
	 * @param {StoredProjectEntryAny} entry1
	 * @param {StoredProjectEntryAny} entry2
	 */
	async projectEntryEquals(entry1, entry2) {
		if (entry1.fileSystemType != entry2.fileSystemType) return false;
		if (entry1.fileSystemType == "fsa" && entry2.fileSystemType == "fsa") {
			return await entry1.fileSystemHandle.isSameEntry(entry2.fileSystemHandle);
		} else if (entry1.fileSystemType == "db") {
			return entry1.projectUuid == entry2.projectUuid;
		} else if (entry1.fileSystemType == "remote") {
			return entry1.projectUuid == entry2.projectUuid;
		}
		return false;
	}

	/**
	 * @param {StoredProjectEntryAny} entry
	 * @returns {Promise<StoredProjectEntryAny[]>}
	 */
	async removeProjectEntryFromList(entry) {
		const list = await this.getRecentProjects();
		const promises = [];
		for (const existingEntry of list) {
			const promise = (async () => {
				const same = await this.projectEntryEquals(entry, existingEntry);
				return {entry: existingEntry, same};
			})();
			promises.push(promise);
		}
		const results = await Promise.allSettled(promises);
		const removeResults = results.filter(r => r.status == "fulfilled" && r.value.same);
		const castRemoveResults = /** @type {PromiseFulfilledResult<{entry: StoredProjectEntryAny, same: boolean}>[]} */ (removeResults);
		const removeEntries = castRemoveResults.map(r => r.value.entry);
		for (const entry of removeEntries) {
			list.splice(list.indexOf(entry), 1);
		}
		return list;
	}

	/**
	 * @param {boolean} visible
	 */
	setVisibility(visible) {
		if (visible == this.visible) return;
		this.visible = visible;

		if (visible) {
			document.body.appendChild(this.el);
			document.body.appendChild(this.curtainEl);
			this.updateRecentProjectsUi();
			this.allowOpeningNew = true;
		} else {
			document.body.removeChild(this.el);
			document.body.removeChild(this.curtainEl);
		}
	}
}
