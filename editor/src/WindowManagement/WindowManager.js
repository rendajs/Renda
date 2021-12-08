import {EditorWindowSplit} from "./EditorWindowSplit.js";
import {EditorWindowTabs} from "./EditorWindowTabs.js";
import {contentWindows} from "./ContentWindows/ContentWindows.js";
import {ContentWindow} from "./ContentWindows/ContentWindow.js";
import {WorkspaceManager} from "./WorkspaceManager.js";
import {generateUuid} from "../Util/Util.js";
import {EventHandler} from "../../../src/Util/EventHandler.js";
import {EDITOR_ENV} from "../editorDefines.js";

/**
 * @typedef {Object} ContentWindowEvent
 * @property {ContentWindow} target
 */

export class WindowManager {
	/** @type {Set<(data: any) => Promise<void>>} */
	onContentWindowPersistentDataFlushRequestCbs = new Set();

	/** @type {EventHandler<typeof ContentWindow, ContentWindowEvent>} */
	contentWindowAddedHandler = new EventHandler();
	/** @type {EventHandler<typeof ContentWindow, ContentWindowEvent>} */
	contentWindowRemovedHandler = new EventHandler();

	constructor() {
		this.rootWindow = null;
		/** @type {WeakRef<ContentWindow>[]} */
		this.lastFocusedContentWindows = [];
		this.lastFocusedContentWindow = null;

		this.isLoadingWorkspace = false;
		this.workspaceManager = new WorkspaceManager();
		this.workspaceManager.onCurrentWorkspaceIdChange(() => {
			this.reloadCurrentWorkspace();
		});

		/** @type {Map<string, typeof ContentWindow>} */
		this.registeredContentWindows = new Map();

		for (const w of contentWindows) {
			this.registerContentWindow(w);
		}

		this.tabDragEnabled = false;

		this.tabDragFeedbackEl = document.createElement("div");
		this.tabDragFeedbackEl.classList.add("tabDragFeedback");

		window.addEventListener("resize", () => {
			if (this.rootWindow) {
				this.rootWindow.onResized();
			}
		});
	}

	init() {
		this.reloadCurrentWorkspace();
	}

	/**
	 * @param {import("./EditorWindow.js").EditorWindow} newRootWindow
	 * @param {boolean} [destructOldRoot]
	 */
	replaceRootWindow(newRootWindow, destructOldRoot = true) {
		if (destructOldRoot) this.rootWindow.destructor();
		this.rootWindow = newRootWindow;
		this.markRootWindowAsRoot();
		document.body.appendChild(this.rootWindow.el);
		this.rootWindow.updateEls();
		this.rootWindow.onResized();
		this.autoSaveWorkspace();
	}

	async reloadCurrentWorkspace() {
		const workspaceData = await this.workspaceManager.getCurrentWorkspace();
		this.loadWorkspace(workspaceData);
	}

	async autoSaveWorkspace() {
		const autoSaveValue = await this.workspaceManager.getAutoSaveValue();
		if (autoSaveValue) {
			await this.saveWorkspace();
		}
	}

	async saveWorkspace() {
		const workspaceData = this.getCurrentWorkspaceData();
		await this.workspaceManager.saveCurrentWorkspace(workspaceData);
	}

	getCurrentWorkspaceData() {
		const rootWindow = this.serializeWorkspaceWindow(this.rootWindow);
		return {rootWindow};
	}

	/**
	 * @param {import("./WorkspaceManager.js").WorkspaceData} workspace
	 */
	loadWorkspace(workspace) {
		this.isLoadingWorkspace = true;

		if (this.rootWindow) {
			this.rootWindow.destructor();
		}
		this.lastFocusedContentWindows = [];
		this.lastFocusedContentWindow = null;
		this.rootWindow = this.parseWorkspaceWindow(workspace.rootWindow);
		this.markRootWindowAsRoot();
		this.parseWorkspaceWindowChildren(workspace.rootWindow, this.rootWindow);

		document.body.appendChild(this.rootWindow.el);
		this.rootWindow.updateEls();
		this.rootWindow.init();
		this.rootWindow.onResized();

		this.isLoadingWorkspace = false;
	}

	getContentWindowPersistentData() {
		const datas = [];
		for (const contentWindow of this.allContentWindows()) {
			if (!contentWindow.persistentData.isEmpty()) {
				datas.push({
					id: contentWindow.uuid,
					type: /** @type {typeof ContentWindow} */ (contentWindow.constructor).contentWindowTypeId,
					data: contentWindow.persistentData.getAll(),
				});
			}
		}
		return datas;
	}

	/**
	 * @param {{id: import("../Util/Util.js").UuidString, type: string, data: any}[]} datas
	 */
	setContentWindowPersistentData(datas = []) {
		const datasSet = new Set(datas);
		const contentWindows = new Set(this.allContentWindows());

		// Set data based on ContentWindow uuid
		for (const data of datasSet) {
			let contentWindow = null;
			for (const c of contentWindows) {
				if (c.uuid == data.id) {
					contentWindow = c;
					break;
				}
			}
			if (contentWindow) {
				contentWindow.persistentData.setAll(data.data);
				contentWindows.delete(contentWindow);
				datasSet.delete(data);
			}
		}

		// Set data based on ContentWindow type
		for (const data of datasSet) {
			let contentWindow = null;
			for (const c of contentWindows) {
				if (/** @type {typeof ContentWindow} */ (c.constructor).contentWindowTypeId == data.type) {
					contentWindow = c;
					break;
				}
			}
			if (contentWindow) {
				contentWindow.persistentData.setAll(data.data);
				contentWindows.delete(contentWindow);
				datasSet.delete(data);
			}
		}

		// Set empty data for the remaining ContentWindows
		for (const contentWindow of contentWindows) {
			contentWindow.persistentData.setAll({});
		}
	}

	async requestContentWindowPersistentDataFlush() {
		const data = this.getContentWindowPersistentData();
		const promises = [];
		for (const cb of this.onContentWindowPersistentDataFlushRequestCbs) {
			promises.push(cb(data));
		}
		await Promise.all(promises);
	}

	/**
	 * @param {(data: any) => Promise<void>} cb
	 */
	onContentWindowPersistentDataFlushRequest(cb) {
		this.onContentWindowPersistentDataFlushRequestCbs.add(cb);
	}

	/**
	 * @param {(data: any) => Promise<void>} cb
	 */
	removeOnContentWindowPersistentDataFlushRequest(cb) {
		this.onContentWindowPersistentDataFlushRequestCbs.delete(cb);
	}

	markRootWindowAsRoot() {
		this.rootWindow.setRoot();
		this.rootWindow.onWorkspaceChange(() => {
			if (!this.isLoadingWorkspace) {
				this.autoSaveWorkspace();
			}
		});
	}

	/**
	 * @param {import("./WorkspaceManager.js").WorkspaceDataWindow} workspaceWindowData
	 */
	parseWorkspaceWindow(workspaceWindowData) {
		/** @type {import("./EditorWindow.js").EditorWindow} */
		let newWindow = null;
		if (workspaceWindowData.type == "split") {
			newWindow = new EditorWindowSplit();
			newWindow.windowManager = this;
			const castWindow = /** @type {EditorWindowSplit} */ (newWindow);
			const castWindowData = /** @type {import("./WorkspaceManager.js").WorkspaceDataWindowSplit} */ (workspaceWindowData);
			castWindow.splitHorizontal = castWindowData.splitHorizontal;
			castWindow.splitPercentage = castWindowData.splitPercentage;
		} else if (workspaceWindowData.type == "tabs") {
			newWindow = new EditorWindowTabs();
			newWindow.windowManager = this;
			const castWindow = /** @type {EditorWindowTabs} */ (newWindow);
			const castWindowData = /** @type {import("./WorkspaceManager.js").WorkspaceDataWindowTabs} */ (workspaceWindowData);
			for (let i = 0; i < castWindowData.tabTypes.length; i++) {
				let uuid = castWindowData.tabUuids?.[i];
				if (!uuid) uuid = generateUuid();
				castWindow.setTabType(i, castWindowData.tabTypes[i], uuid);
			}
			castWindow.setActiveTabIndex(castWindowData.activeTabIndex || 0);
			castWindow.onTabChange(() => {
				if (castWindow.activeTab) {
					this.addContentWindowToLastFocused(castWindow.activeTab);
				}
			});
			castWindow.onFocusedChange(hasFocus => {
				if (hasFocus) {
					this.addContentWindowToLastFocused(castWindow.activeTab);
				}
			});
		}
		return newWindow;
	}

	/**
	 * @param {ContentWindow} contentWindow
	 */
	addContentWindowToLastFocused(contentWindow) {
		for (const existingWeakRef of [...this.lastFocusedContentWindows]) {
			const existing = existingWeakRef.deref();
			if (!existing || existing == contentWindow) {
				this.lastFocusedContentWindows.splice(this.lastFocusedContentWindows.indexOf(existingWeakRef), 1);
			}
		}
		this.lastFocusedContentWindows.unshift(new WeakRef(contentWindow));
		this.lastFocusedContentWindow = contentWindow;
	}

	/**
	 *
	 * @param {import("./WorkspaceManager.js").WorkspaceDataWindow} workspaceWindowData
	 * @param {import("./EditorWindow.js").EditorWindow} existingWorkspaceWindow
	 */
	parseWorkspaceWindowChildren(workspaceWindowData, existingWorkspaceWindow) {
		if (workspaceWindowData.type == "split") {
			const castWorkspaceWindowData = /** @type {import("./WorkspaceManager.js").WorkspaceDataWindowSplit} */ (workspaceWindowData);
			const windowA = this.parseWorkspaceWindow(castWorkspaceWindowData.windowA);
			const windowB = this.parseWorkspaceWindow(castWorkspaceWindowData.windowB);
			const castExistingWorkspaceWindow = /** @type {import("./EditorWindowSplit.js").EditorWindowSplit} */ (existingWorkspaceWindow);
			castExistingWorkspaceWindow.setWindows(windowA, windowB);
			this.parseWorkspaceWindowChildren(castWorkspaceWindowData.windowA, castExistingWorkspaceWindow.windowA);
			this.parseWorkspaceWindowChildren(castWorkspaceWindowData.windowB, castExistingWorkspaceWindow.windowB);
		}
	}

	/**
	 * @param {import("./EditorWindow.js").EditorWindow} workspaceWindow
	 * @returns {import("./WorkspaceManager.js").WorkspaceDataWindow}
	 */
	serializeWorkspaceWindow(workspaceWindow) {
		if (workspaceWindow instanceof EditorWindowSplit) {
			/** @type {import("./WorkspaceManager.js").WorkspaceDataWindowSplit} */
			const data = {
				type: "split",
				splitHorizontal: workspaceWindow.splitHorizontal,
				splitPercentage: workspaceWindow.splitPercentage,
				windowA: this.serializeWorkspaceWindow(workspaceWindow.windowA),
				windowB: this.serializeWorkspaceWindow(workspaceWindow.windowB),
			};
			return data;
		} else if (workspaceWindow instanceof EditorWindowTabs) {
			/** @type {import("./WorkspaceManager.js").WorkspaceDataWindowTabs} */
			const data = {
				type: "tabs",
				tabTypes: workspaceWindow.tabs.map(tab => /** @type {typeof ContentWindow} */ (tab.constructor).contentWindowTypeId),
				activeTabIndex: workspaceWindow.activeTabIndex,
				tabUuids: workspaceWindow.tabs.map(tab => tab.uuid),
			};
			return data;
		}
		return null;
	}

	/**
	 * @param {typeof ContentWindow} constructor
	 */
	registerContentWindow(constructor) {
		if (!(constructor.prototype instanceof ContentWindow)) {
			console.warn("Tried to register content window (" + constructor.name + ") that does not extend ContentWindow class.");
			return;
		}
		if (typeof constructor.contentWindowTypeId != "string") {
			console.warn("Tried to register content window (" + constructor.name + ") with no type id, override the static contentWindowTypeId property in order for this content window to function properly");
			return;
		}

		this.registeredContentWindows.set(constructor.contentWindowTypeId, constructor);

		for (const w of this.allEditorWindows()) {
			w.onContentWindowRegistered(constructor);
		}
	}

	getContentWindowConstructorByType(type) {
		return this.registeredContentWindows.get(type);
	}

	*allEditorWindows() {
		if (!this.rootWindow) return;
		yield this.rootWindow;
		for (const child of this.rootWindow.getChildren()) {
			yield child;
		}
	}

	/**
	 * @returns {Generator<EditorWindowTabs>}
	 */
	*allTabWindows() {
		for (const w of this.allEditorWindows()) {
			if (w instanceof EditorWindowTabs) {
				yield w;
			}
		}
	}

	*allContentWindows() {
		for (const w of this.allTabWindows()) {
			for (const tab of w.tabs) {
				yield tab;
			}
		}
	}

	/**
	 * @template {ContentWindow} T
	 * @param {new () => T} contentWindowConstructor
	 * @returns {Generator<T>}
	 */
	*getContentWindowsByConstructor(contentWindowConstructor) {
		for (const w of this.allContentWindows()) {
			if (w instanceof contentWindowConstructor) {
				yield w;
			}
		}
	}

	/**
	 * Get the first content window of the given type.
	 * @template {ContentWindow} T
	 * @param {new () => T} contentWindowConstructor
	 * @param {boolean} create Whether to create a new content window if none exist.
	 * @returns {T}
	 */
	getOrCreateContentWindowByConstructor(contentWindowConstructor, create = true) {
		for (const w of this.getContentWindowsByConstructor(contentWindowConstructor)) {
			return w;
		}
		if (create) {
			for (const w of this.allEditorWindows()) {
				if (w instanceof EditorWindowTabs) {
					const castConstructorAny = /** @type {*} */ (contentWindowConstructor);
					const castConstructor = /** @type {typeof ContentWindow} */ (castConstructorAny);
					const created = w.addTabType(castConstructor.contentWindowTypeId);
					/* eslint-disable jsdoc/no-undefined-types */
					return /** @type {T} */ (created);
					/* eslint-enable jsdoc/no-undefined-types */
				}
			}
		}
		return null;
	}

	/**
	 * Get the last focused content window of the specefied type.
	 * If no content window of the type has ever been focused, returns the first available content window of that type.
	 * @template {ContentWindow} T
	 * @param {new () => T} contentWindowConstructor
	 * @param {boolean} create Whether to create a new content window if none exist.
	 * @returns {T}
	 */
	getMostSuitableContentWindowByConstructor(contentWindowConstructor, create = true) {
		for (const weakRef of this.lastFocusedContentWindows) {
			const ref = weakRef.deref();
			if (!ref || ref.destructed) continue;
			if (ref instanceof contentWindowConstructor) {
				return ref;
			}
		}
		return this.getOrCreateContentWindowByConstructor(contentWindowConstructor, create);
	}

	/**
	 * @param {string} type
	 * @returns {Generator<ContentWindow>}
	 */
	*getContentWindowsByType(type) {
		const contentWindowConstructor = this.getContentWindowConstructorByType(type);
		yield* this.getContentWindowsByConstructor(contentWindowConstructor);
	}

	/**
	 * @param {string} uuid
	 * @returns {ContentWindow?}
	 */
	getContentWindowByUuid(uuid) {
		for (const contentWindow of this.allContentWindows()) {
			if (contentWindow.uuid == uuid) return contentWindow;
		}
		return null;
	}

	/* eslint-disable jsdoc/require-description-complete-sentence */
	/**
	 * Utility function for quickly getting a reference to an EditorWindow or ContentWindow.
	 * Used by tests and useful for debugging.
	 *
	 * Usage in the javascript console:
	 * ```js
	 * editor.windowManager.getWindowByElement($0)
	 * ```
	 * @param {HTMLElement} el
	 */
	/* eslint-enable jsdoc/require-description-complete-sentence */
	getWindowByElement(el) {
		if (EDITOR_ENV != "dev") return null;

		for (const w of this.allEditorWindows()) {
			if (el == w.el) return w;
			if (w instanceof EditorWindowSplit) {
				if (el == w.elA || el == w.elB || el == w.resizer) return w;
			} else if (w instanceof EditorWindowTabs) {
				if (el == w.tabsEl) return w;
			}
		}

		for (const w of this.allContentWindows()) {
			if (el == w.el || el == w.contentEl) return w;
		}

		return null;
	}

	/**
	 * Focuses on the most suitable content window of the specified type.
	 * Creates one if it doesn't exist.
	 * @template {ContentWindow} T
	 * @param {new () => T} contentWindowConstructor
	 * @returns {T}
	 */
	focusOrCreateContentWindow(contentWindowConstructor) {
		const contentWindow = this.getMostSuitableContentWindowByConstructor(contentWindowConstructor);
		contentWindow.parentEditorWindow.focus();
		contentWindow.parentEditorWindow.setActiveContentWindow(contentWindow);
		return contentWindow;
	}

	createNewContentWindow(type) {
		for (const w of this.allEditorWindows()) {
			if (w instanceof EditorWindowTabs) {
				return w.addTabType(type);
			}
		}
		return null;
	}

	/**
	 * @param {boolean} enabled
	 */
	setTabDragEnabled(enabled) {
		if (enabled == this.tabDragEnabled) return;
		this.tabDragEnabled = enabled;

		for (const w of this.allTabWindows()) {
			w.setTabDragOverlayEnabled(enabled);
		}
		if (enabled) {
			document.body.appendChild(this.tabDragFeedbackEl);
		} else {
			document.body.removeChild(this.tabDragFeedbackEl);
		}
	}

	/**
	 * @param {number} left
	 * @param {number} top
	 * @param {number} width
	 * @param {number} height
	 */
	setTabDragFeedbackRect(left, top, width, height) {
		this.tabDragFeedbackEl.style.transform = `translate(${left}px, ${top}px) scaleX(${width / 100}) scaleY(${height / 100})`;
	}
}
