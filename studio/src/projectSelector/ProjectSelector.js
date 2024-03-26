import { RENDA_VERSION_STRING } from "../../../src/engineDefines.js";
import { IndexedDbUtil } from "../../../src/util/IndexedDbUtil.js";
import { PromiseWaitHelper } from "../../../src/util/PromiseWaitHelper.js";
import { createSpinner } from "../ui/spinner.js";
import { ColorizerFilterManager } from "../util/colorizerFilters/ColorizerFilterManager.js";
import { IndexedDbStudioFileSystem } from "../util/fileSystems/IndexedDbStudioFileSystem.js";

export class ProjectSelector {
	/** @typedef {import("./ProjectManager.js").StoredProjectEntryAny} StoredProjectEntryAny */

	#contentEl;
	#versionEl;
	/** @type {HTMLDivElement?} */
	#updateSpinnerEl = null;
	/** @type {HTMLButtonElement?} */
	#updateButtonEl = null;

	#visible = true;
	#hasEverBeenHidden = false;
	get visible() {
		return this.#visible;
	}

	constructor() {
		this.loadedStudio = null;
		/** @type {Set<(studio: import("../Studio.js").Studio) => void>} */
		this.onStudioLoadCbs = new Set();

		this.indexedDb = new IndexedDbUtil("projectSelector");

		this.curtainEl = document.createElement("div");
		this.curtainEl.classList.add("project-selector-curtain");
		this.curtainEl.addEventListener("click", () => this.setVisibility(false));
		document.body.append(this.curtainEl);

		this.el = document.createElement("div");
		this.el.classList.add("project-selector-window");
		document.body.append(this.el);

		const headerEl = document.createElement("div");
		headerEl.classList.add("project-selector-header");
		this.el.append(headerEl);

		const logoEl = document.createElement("div");
		logoEl.classList.add("project-selector-logo");
		headerEl.append(logoEl);

		const titleEl = document.createElement("h1");
		titleEl.classList.add("project-selector-title");
		titleEl.textContent = "Renda";
		headerEl.append(titleEl);

		this.#versionEl = document.createElement("div");
		this.#versionEl.classList.add("version");
		this.#versionEl.textContent = `v${RENDA_VERSION_STRING} (beta)`;
		headerEl.append(this.#versionEl);

		this.#contentEl = document.createElement("main");
		this.el.append(this.#contentEl);

		this.actionsListEl = this.createList("actions", "Start");
		this.recentListEl = this.createList("recent", "Recent");

		this.shouldOpenEmptyOnLoad = true;
		/**
		 * A value that becomes false once an empty project is loaded in the background.
		 * This is to prevent an empty project from being loaded twice.
		 * This value becomes true again once the project selector becomes visible a second time.
		 */
		this.allowOpeningNew = true;

		this.createAction({
			text: "New Project",
			iconUrl: "static/icons/newDatabase.svg",
			onClick: async () => {
				if (this.allowOpeningNew) {
					this.willOpenProjectAfterLoad();
					const studio = await this.waitForStudio();
					studio.projectManager.openNewDbProject(true);
				}
				this.setVisibility(false);
			},
		});

		const { buttonEl: openProjectButton } = this.createAction({
			text: "Open Project",
			iconUrl: "static/icons/folder.svg",
			onClick: async () => {
				this.willOpenProjectAfterLoad();
				const studio = await this.waitForStudio();
				studio.projectManager.openProjectFromLocalDirectory();
				this.setVisibility(false);
			},
		});
		if (!("showDirectoryPicker" in globalThis)) {
			openProjectButton.disabled = true;
			openProjectButton.title = "Opening local projects is not supported by your browser.";
		}

		this.createAction({
			text: "Connect to Remote",
			iconUrl: "static/icons/remoteSignal.svg",
			onClick: async () => {
				this.willOpenProjectAfterLoad();
				const studio = await this.waitForStudio();
				studio.projectManager.openNewRemoteProject(true);
				this.setVisibility(false);
			},
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

		/**
		 * @typedef {Event & {prompt: () => Promise<{outcome: "accepted" | "dismissed"}>}} BeforeInstallPromptEvent
		 */

		window.addEventListener("beforeinstallprompt", (e) => {
			const event = /** @type {BeforeInstallPromptEvent} */ (e);
			event.preventDefault();
			let text = "Install Renda Studio";
			const ua = navigator.userAgent;
			if (/iphone|ipod/i.test(ua)) {
				text = "Get the iOS App";
			} else if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) {
				text = "Get the iPad App";
			} else if (/android/i.test(ua)) {
				text = "Get the Android App";
			} else if (/mac os x/i.test(ua)) {
				text = "Get the Mac App";
			} else if (/windows/i.test(ua)) {
				text = "Get the Windows App";
			} else if (/linux/i.test(ua)) {
				text = "Get the Linux App";
			}
			const { listItemEl } = this.createAction({
				text,
				iconUrl: "static/icons/download.svg",
				onClick: async () => {
					await event.prompt();
					listItemEl.remove();
				},
			});
		});
	}

	/**
	 * @param {string} name
	 * @param {string} title
	 */
	createList(name, title) {
		const containerEl = document.createElement("div");
		containerEl.classList.add(`project-selector-${name}-list-container`, "project-selector-list-container");
		this.#contentEl.appendChild(containerEl);

		const titleEl = document.createElement("h1");
		titleEl.textContent = title;
		containerEl.appendChild(titleEl);

		const listEl = document.createElement("ul");
		listEl.classList.add("project-selector-list");
		containerEl.appendChild(listEl);

		return listEl;
	}

	/**
	 * @param {CreateListButtonOptions} options
	 */
	createAction(options) {
		return this.createListButton(this.actionsListEl, options);
	}

	/**
	 * @typedef CreateListButtonOptions
	 * @property {string} text
	 * @property {string} iconUrl
	 * @property {() => void} onClick
	 */

	/**
	 * @param {HTMLUListElement} listEl
	 * @param {CreateListButtonOptions} options
	 */
	createListButton(listEl, { iconUrl, text, onClick }) {
		const item = document.createElement("li");
		listEl.appendChild(item);
		const button = document.createElement("button");
		item.appendChild(button);
		button.classList.add("project-selector-button");
		button.addEventListener("click", onClick);

		const buttonWrap = document.createElement("span");
		buttonWrap.classList.add("button-wrap");
		button.append(buttonWrap);

		const iconEl = document.createElement("div");
		iconEl.classList.add("project-selector-button-icon");
		iconEl.style.backgroundImage = `url(${iconUrl})`;
		ColorizerFilterManager.instance().applyFilter(iconEl, "var(--default-button-text-color)");
		buttonWrap.append(iconEl);

		const textEl = document.createElement("span");
		textEl.textContent = text;
		buttonWrap.append(textEl);
		return {
			listItemEl: item,
			buttonEl: button,
		};
	}

	async startGetRecentProjects() {
		/** @type {typeof this.indexedDb.get<StoredProjectEntryAny[]>} */
		const dbGetProjectsList = this.indexedDb.get.bind(this.indexedDb);
		this.recentProjectsList = await dbGetProjectsList("recentProjectsList") || [];
		/** @type {string[]?} */
		let databaseNames = null;
		try {
			const databases = await indexedDB.databases();
			const unfilteredNames = databases.map((db) => db.name);
			databaseNames = /** @type {string[]} */ (unfilteredNames.filter((db) => Boolean(db)));
		} catch {
			// Some browsers don't support `databases()`, in that case we just don't filter the list.
		}
		if (databaseNames) {
			const certainNames = databaseNames;
			this.recentProjectsList = this.recentProjectsList.filter((entry) => {
				if (entry.fileSystemType != "db") return true;

				const dbName = IndexedDbStudioFileSystem.getDbName(entry.projectUuid);
				return certainNames.includes(dbName);
			});
		}
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
			let icon = "";
			let tooltip = "";
			if (entry.fileSystemType == "fsa") {
				icon = "folder";
				tooltip = "File System on Disk";
			} else if (entry.fileSystemType == "db") {
				icon = "database";
				tooltip = "Stored in Cookies";
			} else if (entry.fileSystemType == "remote") {
				icon = "remoteSignal";
				tooltip = "Remote File System";
				if (entry.remoteProjectConnectionType == "internal") {
					tooltip += " (Internal Connection)";
				} else if (entry.remoteProjectConnectionType == "webRtc") {
					tooltip += " (WebRTC Connection)";
				}
			}
			const { buttonEl } = this.createListButton(this.recentListEl, {
				text,
				iconUrl: `static/icons/${icon}.svg`,
				onClick: async () => {
					this.willOpenProjectAfterLoad();
					const studio = await this.waitForStudio();
					studio.projectManager.openExistingProject(entry, true);
					this.setVisibility(false);
				},
			});
			buttonEl.title = tooltip;
			buttonEl.addEventListener("contextmenu", (e) => {
				if (this.loadedStudio) {
					e.preventDefault();
					let deleteText = "Remove from Recents";
					if (entry.fileSystemType == "db") {
						deleteText = "Delete";
					}
					const contextMenu = this.loadedStudio.popoverManager.createContextMenu([
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
									const studio = await this.waitForStudio();
									await studio.projectManager.deleteDbProject(entry);
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
			const studio = await this.waitForStudio();
			studio.projectManager.openExistingProject(entry, false);
			this.setVisibility(false);
			return;
		}
	}

	/**
	 * @returns {Promise<import("../Studio.js").Studio>}
	 */
	async waitForStudio() {
		if (this.loadedStudio) return this.loadedStudio;

		return new Promise((r) => this.onStudioLoadCbs.add(r));
	}

	/**
	 * By default an empty project is loaded once studio is ready. However,
	 * to prevent the overhead of creating a new project you can call this if you
	 * are certain opening of a project on load has already been handled elsewhere.
	 */
	willOpenProjectAfterLoad() {
		this.shouldOpenEmptyOnLoad = false;
	}

	/**
	 * @param {import("../Studio.js").Studio} studio
	 */
	setStudioLoaded(studio) {
		this.loadedStudio = studio;
		studio.projectManager.onProjectOpenEntryChange((entry) => {
			if (entry) {
				this.addRecentProjectEntry(entry);
			}
		});
		studio.serviceWorkerManager.onInstallingStateChange(() => {
			const state = studio.serviceWorkerManager.installingState;
			if (state == "installing") {
				if (!this.#updateSpinnerEl) {
					this.#updateSpinnerEl = createSpinner();
					this.#versionEl.append(this.#updateSpinnerEl);
				}
			} else {
				if (this.#updateSpinnerEl) {
					this.#versionEl.removeChild(this.#updateSpinnerEl);
					this.#updateSpinnerEl = null;
				}
			}
			if (state == "waiting-for-restart") {
				if (!this.#updateSpinnerEl) {
					this.#updateButtonEl = document.createElement("button");
					this.#updateButtonEl.textContent = "Update";
					this.#updateButtonEl.addEventListener("click", () => {
						if (!this.#hasEverBeenHidden && studio.serviceWorkerManager.openTabCount <= 1) {
							studio.serviceWorkerManager.restartClients();
						}
						studio.windowManager.focusOrCreateContentWindow("renda:about");
						this.setVisibility(false);
					});
					this.#versionEl.append(this.#updateButtonEl);
				}
			} else {
				if (this.#updateButtonEl) {
					this.#versionEl.removeChild(this.#updateButtonEl);
					this.#updateButtonEl = null;
				}
			}
		});
		if (this.shouldOpenEmptyOnLoad) {
			studio.projectManager.openNewDbProject(false);
			this.allowOpeningNew = false;
		}
		this.onStudioLoadCbs.forEach((cb) => cb(studio));
	}

	async deleteProjectsNotWorthSaving() {
		const studio = await this.waitForStudio();
		const recentProjects = await this.getRecentProjects();
		const promises = [];
		for (const entry of recentProjects) {
			if (!entry.isWorthSaving && !studio.projectManager.isCurrentProjectEntry(entry)) {
				const promise = (async () => {
					await studio.projectManager.deleteDbProject(entry);
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
				return { entry: existingEntry, same };
			})();
			promises.push(promise);
		}
		const results = await Promise.allSettled(promises);
		const removeResults = results.filter((r) => r.status == "fulfilled" && r.value.same);
		const castRemoveResults = /** @type {PromiseFulfilledResult<{entry: StoredProjectEntryAny, same: boolean}>[]} */ (removeResults);
		const removeEntries = castRemoveResults.map((r) => r.value.entry);
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
		this.#visible = visible;

		if (visible) {
			document.body.appendChild(this.el);
			document.body.appendChild(this.curtainEl);
			this.updateRecentProjectsUi();
			this.allowOpeningNew = true;
		} else {
			this.#hasEverBeenHidden = true;
			document.body.removeChild(this.el);
			document.body.removeChild(this.curtainEl);
		}
	}
}
