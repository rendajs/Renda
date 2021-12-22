import {IndexedDbUtil} from "../../../src/mod.js";
import {PromiseWaitHelper} from "../../../src/util/PromiseWaitHelper.js";

export class ProjectSelector {
	/** @typedef {import("../Managers/ProjectManager.js").StoredProjectEntry} StoredProjectEntry */

	constructor() {
		this.visible = true;
		this.loadedEditor = null;
		this.onEditorLoadCbs = new Set();

		this.indexedDb = new IndexedDbUtil("projectSelector");

		this.curtainEl = document.createElement("div");
		this.curtainEl.classList.add("project-selector-curtain");
		this.curtainEl.addEventListener("click", () => this.setVisibility(false));
		document.body.appendChild(this.curtainEl);

		this.el = document.createElement("div");
		this.el.classList.add("project-selector-window");
		document.body.appendChild(this.el);

		const titleEl = document.createElement("h1");
		titleEl.classList.add("project-selector-title");
		titleEl.textContent = "Jespers Wacky Web Engine";
		this.el.appendChild(titleEl);

		this.actionsListEl = this.createList("actions", "Start");
		this.recentListEl = this.createList("recent", "Recent");

		this.createAction("New Project", async () => {
			const editor = await this.waitForEditor();
			editor.projectManager.openNewDbProject();
			this.setVisibility(false);
		});
		this.createAction("Open Project", async () => {
			const editor = await this.waitForEditor();
			editor.projectManager.openProjectFromLocalDirectory();
			this.setVisibility(false);
		});
		this.createAction("Connect Remote Project", async () => {
			const editor = await this.waitForEditor();
			editor.projectManager.openNewRemoteProject();
			this.setVisibility(false);
		});

		this.recentProjectsList = null;
		this.getRecentsWaiter = new PromiseWaitHelper();

		this.isRunningAddRecentProjects = false;
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

		const titleEl = document.createElement("h2");
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
		this.getRecentsWaiter.fire();
	}

	/**
	 * @returns {Promise<StoredProjectEntry[]>}
	 */
	async getRecentProjects() {
		await this.getRecentsWaiter.wait();
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
				const editor = await this.waitForEditor();
				editor.projectManager.openExistingProject(entry);
				this.setVisibility(false);
			});
			let tooltip = "";
			if (entry.fileSystemType == "native") {
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
			el.addEventListener("contextmenu", e => {
				if (this.loadedEditor) {
					e.preventDefault();
					let deleteText = "Remove from Recents";
					if (entry.fileSystemType == "db") {
						deleteText = "Delete";
					}
					const contextMenu = this.loadedEditor.contextMenuManager.createContextMenu([
						{
							text: "Change Alias",
							onClick: async () => {
								const alias = prompt("New Alias", entry.name);
								await this.setRecentProjectAlias(entry, alias);
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
									await editor.projectManager.deleteDbProject(entry.projectUuid);
								}
								this.removeRecentProjectsEntry(entry);
							},
						},
					]);
					contextMenu.setPos({x: e.clientX, y: e.clientY});
				}
			});
		}
	}

	async openMostRecentProject() {
		const list = await this.getRecentProjects();
		for (const entry of list) {
			if (!entry.isWorthSaving) continue;
			const editor = await this.waitForEditor();
			editor.projectManager.openExistingProject(entry);
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
	 * @param {import("../Editor.js").Editor} editor
	 */
	setEditorLoaded(editor) {
		this.loadedEditor = editor;
		editor.projectManager.onProjectOpenEntryChange(entry => {
			this.addRecentProjectEntry(entry);
		});
		this.onEditorLoadCbs.forEach(cb => cb(editor));
	}

	async deleteProjectsNotWorthSaving() {
		const editor = await this.waitForEditor();
		const recentProjects = await this.getRecentProjects();
		const promises = [];
		for (const entry of recentProjects) {
			if (!entry.isWorthSaving && !editor.projectManager.isCurrentProjectEntry(entry)) {
				const promise = (async () => {
					await editor.projectManager.deleteDbProject(entry.projectUuid);
					this.removeRecentProjectsEntry(entry);
				})();
				promises.push(promise);
			}
		}
		await Promise.all(promises);
	}

	/**
	 * @param {StoredProjectEntry} entry
	 */
	async addRecentProjectEntry(entry) {
		this.addRecentProjectsQueue.push(entry);
		if (this.isRunningAddRecentProjects) return;

		this.isRunningAddRecentProjects = true;
		while (this.addRecentProjectsQueue.length > 0) {
			const entry = this.addRecentProjectsQueue.shift();
			const newList = await this.removeProjectEntryFromList(entry);
			newList.unshift(entry);
		}
		await this.saveRecentProjects();
		this.isRunningAddRecentProjects = false;
	}

	/**
	 * @param {StoredProjectEntry} entry
	 */
	async removeRecentProjectsEntry(entry) {
		await this.removeProjectEntryFromList(entry);
		await this.saveRecentProjects();
	}

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
	 * @param {StoredProjectEntry} entry1
	 * @param {StoredProjectEntry} entry2
	 */
	async projectEntryEquals(entry1, entry2) {
		if (entry1.fileSystemType != entry2.fileSystemType) return false;
		if (entry1.fileSystemType == "native") {
			return await entry1.fileSystemHandle.isSameEntry(entry2.fileSystemHandle);
		} else if (entry1.fileSystemType == "db") {
			return entry1.projectUuid == entry2.projectUuid;
		} else if (entry1.fileSystemType == "remote") {
			return entry1.projectUuid == entry2.projectUuid;
		}
		return false;
	}

	/**
	 * @param {StoredProjectEntry} entry
	 * @returns {Promise<StoredProjectEntry[]>}
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
		const castRemoveResults = /** @type {PromiseFulfilledResult<{entry: StoredProjectEntry, same: boolean}>[]} */ (removeResults);
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
		} else {
			document.body.removeChild(this.el);
			document.body.removeChild(this.curtainEl);
		}
	}
}
