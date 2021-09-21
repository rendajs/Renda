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
	}

	clearRecentProjectsUi() {
		while (this.recentList.firstChild) {
			this.recentList.removeChild(this.recentList.firstChild);
		}
	}

	async updateRecentProjectsUi() {
		const list = await this.getRecentProjects();

		for (const entry of list) {
			this.createListButton(this.recentList, entry.name, async () => {
				const editor = await this.waitForEditor();
				editor.projectManager.openExistingProject(entry);
				this.setVisibility(false);
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
		this.onEditorLoadCbs.forEach(cb => cb(editor));
	}

	/**
	 * @param {StoredProjectEntry} entry
	 */
	async addRecentProjectEntry(entry) {
		/** @type {StoredProjectEntry[]} */
		let list = await this.getRecentProjects();

		const existingEntries = new Set();
		const existingEntriesOfSameType = list.filter(e => e.fileSystemType == entry.fileSystemType);
		const existingEntriesByUuid = existingEntriesOfSameType.filter(e => e.projectUuid == entry.projectUuid);
		for (const entry of existingEntriesByUuid) {
			existingEntries.add(entry);
		}
		if (entry.fileSystemType == "native") {
			const promises = [];
			for (const existingEntry of existingEntriesOfSameType) {
				const promise = (async () => {
					const same = await entry.fileSystemHandle.isSameEntry(existingEntry.fileSystemHandle);
					return {entry: existingEntry, same};
				})();
				promises.push(promise);
			}
			const results = await Promise.allSettled(promises);
			const fulfilledEntries = results.filter(r => r.status == "fulfilled" && r.value.same);
			const castFulfilledEntries = /** @type {PromiseFulfilledResult<{entry: StoredProjectEntry, same: boolean}>[]} */ (fulfilledEntries);
			const existingEntriesByFileSystemHandle = castFulfilledEntries.map(r => r.value.entry);
			for (const entry of existingEntriesByFileSystemHandle) {
				existingEntries.add(entry);
			}
		}
		list = list.filter(e => !existingEntries.has(e));
		list.unshift(entry);
		await this.setRecentProjects(list);
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
			this.clearRecentProjectsUi();
			this.updateRecentProjectsUi();
		} else {
			document.body.removeChild(this.el);
			document.body.removeChild(this.curtainEl);
		}
	}
}
