import {SplitStudioWindow} from "./SplitStudioWindow.js";
import {TabsStudioWindow} from "./TabsStudioWindow.js";
import {ContentWindow} from "./contentWindows/ContentWindow.js";
import {WorkspaceManager} from "./WorkspaceManager.js";
import {generateUuid} from "../../../src/util/mod.js";
import {EventHandler} from "../../../src/util/EventHandler.js";
import {STUDIO_ENV} from "../studioDefines.js";
import {getStudioInstance} from "../studioInstance.js";

/**
 * @typedef {object} ContentWindowEvent
 * @property {ContentWindow} target
 */

/**
 * @typedef ContentWindowPersistentDiskData
 * @property {import("../../../src/util/mod.js").UuidString} id
 * @property {string} type
 * @property {Object<string, unknown>} data
 */

export class WindowManager {
	/** @deprecated @type {Set<(data: any) => Promise<void>>} */
	onContentWindowPersistentDataFlushRequestCbs = new Set();

	/** @type {Set<(data: unknown) => Promise<void>>} */
	#onPreferencesFlushRequest = new Set();

	/** @type {EventHandler<typeof ContentWindow, ContentWindowEvent>} */
	contentWindowAddedHandler = new EventHandler();
	/** @type {EventHandler<typeof ContentWindow, ContentWindowEvent>} */
	contentWindowRemovedHandler = new EventHandler();

	/** @type {import("../keyboardShortcuts/ShorcutConditionValueSetter.js").ShorcutConditionValueSetter<string>?} */
	#lastClickedValueSetter = null;
	/** @type {import("../keyboardShortcuts/ShorcutConditionValueSetter.js").ShorcutConditionValueSetter<string>?} */
	#lastFocusedValueSetter = null;

	constructor() {
		this.rootWindow = null;
		/** @type {WeakRef<ContentWindow>[]} */
		this.lastFocusedContentWindows = [];
		this.lastFocusedContentWindow = null;
		/** @type {ContentWindow?} */
		this.lastClickedContentWindow = null;

		this.isLoadingWorkspace = false;
		this.workspaceManager = new WorkspaceManager();
		this.workspaceManager.onCurrentWorkspaceIdChange(() => {
			this.reloadCurrentWorkspace();
		});

		/** @type {Map<string, typeof ContentWindow>} */
		this.registeredContentWindows = new Map();

		this.tabDragEnabled = false;

		this.tabDragFeedbackEl = document.createElement("div");
		this.tabDragFeedbackEl.classList.add("tabDragFeedback");

		window.addEventListener("resize", () => {
			if (this.rootWindow) {
				this.rootWindow.onResized();
			}
		});
	}

	async init() {
		const shortcuts = getStudioInstance().keyboardShortcutManager;
		const lastClickedCondition = shortcuts.getCondition("windowManager.lastClickedContentWindowTypeId");
		this.#lastClickedValueSetter = lastClickedCondition.requestValueSetter();
		const lastFocusedCondition = shortcuts.getCondition("windowManager.lastFocusedContentWindowTypeId");
		this.#lastFocusedValueSetter = lastFocusedCondition.requestValueSetter();

		await this.reloadCurrentWorkspace();
	}

	/**
	 * @param {import("./StudioWindow.js").StudioWindow} newRootWindow
	 * @param {boolean} [destructOldRoot]
	 */
	replaceRootWindow(newRootWindow, destructOldRoot = true) {
		if (this.rootWindow) {
			if (destructOldRoot) this.rootWindow.destructor();
		}
		this.rootWindow = newRootWindow;
		this.markRootWindowAsRoot();
		document.body.appendChild(this.rootWindow.el);
		this.rootWindow.updateEls();
		this.rootWindow.onResized();
		this.autoSaveWorkspace();
	}

	assertHasRootWindow() {
		if (!this.rootWindow) throw new Error("No root window loaded.");
		return this.rootWindow;
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
		const rw = this.assertHasRootWindow();
		const rootWindow = this.serializeWorkspaceWindow(rw);
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
		this.lastClickedContentWindow = null;
		this.rootWindow = this.parseWorkspaceWindow(workspace.rootWindow);
		this.markRootWindowAsRoot();
		this.parseWorkspaceWindowChildren(workspace.rootWindow, this.rootWindow);

		document.body.appendChild(this.rootWindow.el);
		this.rootWindow.updateEls();
		this.rootWindow.init();
		this.rootWindow.onResized();

		this.isLoadingWorkspace = false;
	}

	/**
	 * @param {(data: unknown) => Promise<void>} cb
	 */
	onContentWindowPreferencesFlushRequest(cb) {
		this.#onPreferencesFlushRequest.add(cb);
	}

	/**
	 * @param {(data: unknown) => Promise<void>} cb
	 */
	removeOnContentWindowPreferencesFlushRequest(cb) {
		this.#onPreferencesFlushRequest.delete(cb);
	}

	async requestContentWindowPreferencesFlush() {
		/** @type {ContentWindowPersistentDiskData[]} */
		const datas = [];
		for (const contentWindow of this.allContentWindows()) {
			const data = contentWindow.getProjectPreferencesLocationData();
			if (data) {
				datas.push({
					id: contentWindow.uuid,
					type: /** @type {typeof ContentWindow} */ (contentWindow.constructor).contentWindowTypeId,
					data,
				});
			}
		}

		const flushData = datas.length == 0 ? null : datas;

		const promises = [];
		for (const cb of this.#onPreferencesFlushRequest) {
			promises.push(cb(flushData));
		}
		await Promise.all(promises);
	}

	/**
	 * @param {ContentWindowPersistentDiskData[]} datas
	 */
	setContentWindowPreferences(datas = []) {
		const datasSet = new Set(datas);
		const contentWindows = new Set(this.allContentWindows());

		// First we try to find the content window by uuid for each data item
		for (const data of datasSet) {
			let contentWindow = null;
			for (const c of contentWindows) {
				if (c.uuid == data.id) {
					contentWindow = c;
					break;
				}
			}
			if (contentWindow) {
				contentWindow.setProjectPreferencesLocationData(data.data);
				contentWindows.delete(contentWindow);
				datasSet.delete(data);
			}
		}

		// If some of the uuids were not found, the user likely has a different workspace open.
		// We'll apply remaining data based on the content window types.
		for (const data of datasSet) {
			let contentWindow = null;
			for (const c of contentWindows) {
				if (/** @type {typeof ContentWindow} */ (c.constructor).contentWindowTypeId == data.type) {
					contentWindow = c;
					break;
				}
			}
			if (contentWindow) {
				contentWindow.setProjectPreferencesLocationData(data.data);
				contentWindows.delete(contentWindow);
				datasSet.delete(data);
			}
		}

		// If there's still content windows left at this point.
		// We want ot notify them that no data exists for them so that any old data gets cleared.
		for (const contentWindow of contentWindows) {
			contentWindow.setProjectPreferencesLocationData({});
		}
	}

	/**
	 * @deprecated
	 */
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
	 * @deprecated
	 * @param {ContentWindowPersistentDiskData[]} datas
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

	/**
	 * @deprecated
	 */
	async requestContentWindowPersistentDataFlush() {
		const data = this.getContentWindowPersistentData();
		const promises = [];
		for (const cb of this.onContentWindowPersistentDataFlushRequestCbs) {
			promises.push(cb(data));
		}
		await Promise.all(promises);
	}

	/**
	 * @deprecated
	 * @param {(data: any) => Promise<void>} cb
	 */
	onContentWindowPersistentDataFlushRequest(cb) {
		this.onContentWindowPersistentDataFlushRequestCbs.add(cb);
	}

	/**
	 * @deprecated
	 * @param {(data: any) => Promise<void>} cb
	 */
	removeOnContentWindowPersistentDataFlushRequest(cb) {
		this.onContentWindowPersistentDataFlushRequestCbs.delete(cb);
	}

	markRootWindowAsRoot() {
		const rootWindow = this.assertHasRootWindow();
		rootWindow.setRoot();
		rootWindow.onWorkspaceChange(() => {
			if (!this.isLoadingWorkspace) {
				this.autoSaveWorkspace();
			}
		});
	}

	/**
	 * @template {import("./WorkspaceManager.js").WorkspaceDataWindow?} T
	 * @param {T} workspaceWindowData
	 * @returns {T extends import("./WorkspaceManager.js").WorkspaceDataWindow ? import("./StudioWindow.js").StudioWindow : null}
	 */
	parseWorkspaceWindow(workspaceWindowData) {
		if (!workspaceWindowData) return /** @type {any} */ (null);
		/** @type {import("./StudioWindow.js").StudioWindow?} */
		let newWindow = null;
		if (workspaceWindowData.type == "split") {
			newWindow = new SplitStudioWindow(this);
			const castWindow = /** @type {SplitStudioWindow} */ (newWindow);
			const castWindowData = /** @type {import("./WorkspaceManager.js").WorkspaceDataWindowSplit} */ (workspaceWindowData);
			castWindow.splitHorizontal = castWindowData.splitHorizontal;
			castWindow.splitPercentage = castWindowData.splitPercentage;
		} else if (workspaceWindowData.type == "tabs") {
			newWindow = new TabsStudioWindow(this);
			const castWindow = /** @type {TabsStudioWindow} */ (newWindow);
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
			castWindow.onClickWithin(() => {
				this.addContentWindowToLastClicked(castWindow.activeTab);
			});
			castWindow.onFocusedWithinChange(hasFocus => {
				if (hasFocus) {
					this.addContentWindowToLastFocused(castWindow.activeTab);
				}
			});
		} else {
			const castData = /** @type {any} */ (workspaceWindowData);
			throw new Error("Workspace has an invalid window type: " + castData.type);
		}
		return /** @type {any} */ (newWindow);
	}

	/**
	 * @private
	 * @param {ContentWindow} contentWindow
	 */
	addContentWindowToLastClicked(contentWindow) {
		this.lastClickedContentWindow = contentWindow;
		contentWindow.activate();
		const castConstructor = /** @type {typeof ContentWindow} */ (contentWindow.constructor);
		this.#lastClickedValueSetter?.setValue(castConstructor.contentWindowTypeId);
	}

	/**
	 * @private
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
		const castConstructor = /** @type {typeof ContentWindow} */ (contentWindow.constructor);
		this.#lastFocusedValueSetter?.setValue(castConstructor.contentWindowTypeId);
	}

	/**
	 * @param {import("./WorkspaceManager.js").WorkspaceDataWindow} workspaceWindowData
	 * @param {import("./StudioWindow.js").StudioWindow} existingWorkspaceWindow
	 */
	parseWorkspaceWindowChildren(workspaceWindowData, existingWorkspaceWindow) {
		if (workspaceWindowData.type == "split") {
			const castWorkspaceWindowData = /** @type {import("./WorkspaceManager.js").WorkspaceDataWindowSplit} */ (workspaceWindowData);
			const windowA = this.parseWorkspaceWindow(castWorkspaceWindowData.windowA);
			const windowB = this.parseWorkspaceWindow(castWorkspaceWindowData.windowB);
			const castExistingWorkspaceWindow = /** @type {import("./SplitStudioWindow.js").SplitStudioWindow} */ (existingWorkspaceWindow);
			castExistingWorkspaceWindow.setWindows(windowA, windowB);
			if (castWorkspaceWindowData.windowA && windowA) this.parseWorkspaceWindowChildren(castWorkspaceWindowData.windowA, windowA);
			if (castWorkspaceWindowData.windowB && windowB) this.parseWorkspaceWindowChildren(castWorkspaceWindowData.windowB, windowB);
		}
	}

	/**
	 * @template {import("./StudioWindow.js").StudioWindow?} T
	 * @param {T} workspaceWindow
	 * @returns {T extends import("./StudioWindow.js").StudioWindow ? import("./WorkspaceManager.js").WorkspaceDataWindow : null}
	 */
	serializeWorkspaceWindow(workspaceWindow) {
		if (workspaceWindow instanceof SplitStudioWindow) {
			/** @type {import("./WorkspaceManager.js").WorkspaceDataWindowSplit} */
			const data = {
				type: "split",
				splitHorizontal: workspaceWindow.splitHorizontal,
				splitPercentage: workspaceWindow.splitPercentage,
				windowA: this.serializeWorkspaceWindow(workspaceWindow.windowA),
				windowB: this.serializeWorkspaceWindow(workspaceWindow.windowB),
			};
			return /** @type {any} */ (data);
		} else if (workspaceWindow instanceof TabsStudioWindow) {
			/** @type {import("./WorkspaceManager.js").WorkspaceDataWindowTabs} */
			const data = {
				type: "tabs",
				tabTypes: workspaceWindow.tabs.map(tab => /** @type {typeof ContentWindow} */ (tab.constructor).contentWindowTypeId),
				activeTabIndex: workspaceWindow.activeTabIndex,
				tabUuids: workspaceWindow.tabs.map(tab => tab.uuid),
			};
			return /** @type {any} */ (data);
		}
		return /** @type {any} */ (null);
	}

	/**
	 * @param {typeof ContentWindow} constructor
	 */
	registerContentWindow(constructor) {
		if (!(constructor.prototype instanceof ContentWindow)) {
			console.warn("Tried to register content window (" + constructor.name + ") that does not extend ContentWindow class.");
			return;
		}
		if (!constructor.contentWindowTypeId) {
			console.warn("Tried to register content window (" + constructor.name + ") with no type id, override the static contentWindowTypeId property in order for this content window to function properly");
			return;
		}

		this.registeredContentWindows.set(constructor.contentWindowTypeId, constructor);

		for (const w of this.allStudioWindows()) {
			w.onContentWindowRegistered(constructor);
		}
	}

	/**
	 * @param {string} type
	 */
	getContentWindowConstructorByType(type) {
		return this.registeredContentWindows.get(type);
	}

	*allStudioWindows() {
		if (!this.rootWindow) return;
		yield this.rootWindow;
		for (const child of this.rootWindow.getChildren()) {
			yield child;
		}
	}

	/**
	 * @returns {Generator<TabsStudioWindow>}
	 */
	*allTabWindows() {
		for (const w of this.allStudioWindows()) {
			if (w instanceof TabsStudioWindow) {
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
	 * @param {new (...args: ConstructorParameters<typeof ContentWindow>) => T} contentWindowConstructor
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
	 * @param {new (...args: ConstructorParameters<typeof ContentWindow>) => T} contentWindowConstructor
	 * @param {boolean} create Whether to create a new content window if none exist.
	 * @returns {T?}
	 */
	getOrCreateContentWindowByConstructor(contentWindowConstructor, create = true) {
		for (const w of this.getContentWindowsByConstructor(contentWindowConstructor)) {
			return w;
		}
		if (create) {
			for (const w of this.allStudioWindows()) {
				if (w instanceof TabsStudioWindow) {
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
	 * @param {new (...args: ConstructorParameters<typeof ContentWindow>) => T} contentWindowConstructor
	 * @param {boolean} create Whether to create a new content window if none exist.
	 * @returns {T?}
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
		if (!contentWindowConstructor) return;
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
	 * Utility function for quickly getting a reference to a StudioWindow or ContentWindow.
	 * Used by tests and useful for debugging.
	 *
	 * Usage in the javascript console:
	 * ```js
	 * studio.windowManager.getWindowByElement($0)
	 * ```
	 * @param {HTMLElement} el
	 */
	/* eslint-enable jsdoc/require-description-complete-sentence */
	getWindowByElement(el) {
		if (STUDIO_ENV != "dev") return null;

		for (const w of this.allStudioWindows()) {
			if (el == w.el) return w;
			if (w instanceof SplitStudioWindow) {
				if (el == w.elA || el == w.elB || el == w.resizer) return w;
			} else if (w instanceof TabsStudioWindow) {
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
	 * @param {new (...args: ConstructorParameters<typeof ContentWindow>) => T} contentWindowConstructor
	 * @returns {T}
	 */
	focusOrCreateContentWindow(contentWindowConstructor) {
		const contentWindow = this.getMostSuitableContentWindowByConstructor(contentWindowConstructor);
		if (!contentWindow) throw new Error("Failed to create content window.");
		if (!contentWindow.parentStudioWindow) throw new Error("Assertion failed, content window has no parent window.");
		contentWindow.parentStudioWindow.focus();
		contentWindow.parentStudioWindow.setActiveContentWindow(contentWindow);
		return contentWindow;
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
