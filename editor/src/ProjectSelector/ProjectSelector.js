import IndexedDbUtil from "../Util/IndexedDbUtil.js";

export default class ProjectSelector {
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

		this.actionsList = this.createList("actions", "Start");
		this.recentList = this.createList("recent", "Recent");

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

		this.updateRecentProjectsUi();
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
		this.createListButton(this.actionsList, name, onClick);
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

	/**
	 * @returns {Promise<StoredProjectEntry[]>}
	 */
	async getRecentProjects() {
		let list = await this.indexedDb.get("recentProjectsList");
		if (!list) list = [];
		return list;
	}

	/**
	 * @param {StoredProjectEntry[]} list
	 */
	async setRecentProjects(list) {
		await this.indexedDb.set("recentProjectsList", list);
		if (this.visible) {
			await this.updateRecentProjectsUi();
		}
	}

	async updateRecentProjectsUi() {
		const list = await this.getRecentProjects();

		while (this.recentList.firstChild) {
			this.recentList.removeChild(this.recentList.firstChild);
		}

		for (const entry of list) {
			let text = entry.name;
			if (entry.alias) {
				text = entry.alias;
			}
			const el = this.createListButton(this.recentList, text, async () => {
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
					const contextMenu = this.loadedEditor.contextMenuManager.createContextMenu([
						{
							text: "Change alias",
							onClick: async () => {
								const alias = prompt("New alias", entry.name);
								await this.setRecentProjectAlias(entry, alias);
							},
						},
						{
							text: "Delete",
							onClick: () => {
								this.removeRecentProjectsEntry(entry);
								// todo: Delete internal file systems and show prompt
							},
						},
					]);
					contextMenu.setPos(e.clientX, e.clientY);
				}
			});
		}
	}

	/**
	 * @returns {Promise<import("../Editor.js").default>}
	 */
	async waitForEditor() {
		if (this.loadedEditor) return this.loadedEditor;

		return new Promise(r => this.onEditorLoadCbs.add(r));
	}

	/**
	 * @param {import("../Editor.js").default} editor
	 */
	setEditorLoaded(editor) {
		this.loadedEditor = editor;
		editor.projectManager.onProjectBecameWorthSaving(entry => {
			this.addRecentProjectEntry(entry);
		});
		editor.projectManager.onProjectOpenEntryChange(entry => {
			this.addRecentProjectEntry(entry);
		});
		this.onEditorLoadCbs.forEach(cb => cb(editor));
	}

	/**
	 * @param {StoredProjectEntry} entry
	 */
	async addRecentProjectEntry(entry) {
		const list = await this.getRecentProjects();
		const newList = await this.removeProjectEntryFromList(entry, list);
		newList.unshift(entry);
		await this.setRecentProjects(newList);
	}

	/**
	 * @param {StoredProjectEntry} entry
	 */
	async removeRecentProjectsEntry(entry) {
		const list = await this.getRecentProjects();
		const newList = await this.removeProjectEntryFromList(entry, list);
		await this.setRecentProjects(newList);
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
		await this.setRecentProjects(list);
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
	 * @param {StoredProjectEntry[]} list
	 * @returns {Promise<StoredProjectEntry[]>}
	 */
	async removeProjectEntryFromList(entry, list) {
		const promises = [];
		for (const existingEntry of list) {
			const promise = (async () => {
				const same = await this.projectEntryEquals(entry, existingEntry);
				return {entry: existingEntry, same};
			})();
			promises.push(promise);
		}
		const results = await Promise.allSettled(promises);
		const differentResults = results.filter(r => r.status == "fulfilled" && !r.value.same);
		const castDifferentResults = /** @type {PromiseFulfilledResult<{entry: StoredProjectEntry, same: boolean}>[]} */ (differentResults);
		const newList = castDifferentResults.map(r => r.value.entry);
		return newList;
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
