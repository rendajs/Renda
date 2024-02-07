import {StudioWindow} from "./StudioWindow.js";
import {getElementSize, parseMimeType} from "../util/util.js";
import {generateUuid, iLerp} from "../../../src/util/mod.js";
import {getStudioInstance} from "../studioInstance.js";
import {Button} from "../ui/Button.js";
import {ButtonGroup} from "../ui/ButtonGroup.js";
import {SplitStudioWindow} from "./SplitStudioWindow.js";

export class TabsStudioWindow extends StudioWindow {
	/** @type {string[]} */
	#intendedTabTypes = [];
	/** @type {import("../../../src/util/mod.js").UuidString[]} */
	#intendedTabUuids = [];

	/** @typedef {import("./contentWindows/ContentWindow.js").ContentWindow} ContentWindow */
	/** @typedef {typeof import("./contentWindows/ContentWindow.js").ContentWindow} ContentWindowConstructor */

	/**
	 * @param {ConstructorParameters<typeof StudioWindow>} args
	 */
	constructor(...args) {
		super(...args);

		this.el.classList.add("studio-window-tabs");

		/** @type {Array<ContentWindow>} */
		this.tabs = [];
		this.activeTabIndex = -1;
		/** @type {Set<() => void>} */
		this.onTabChangeCbs = new Set();

		this.tabsSelectorGroup = new ButtonGroup();
		this.tabsSelectorGroup.el.classList.add("studio-window-tab-button-group");
		this.el.appendChild(this.tabsSelectorGroup.el);

		this.boundOnTabsContextMenu = this.onTabsContextMenu.bind(this);
		this.tabsSelectorGroup.onContextMenu(this.boundOnTabsContextMenu);

		this.tabsEl = document.createElement("div");
		this.tabsEl.classList.add("studio-window-tabs-list");
		this.el.appendChild(this.tabsEl);

		this.tabDragOverlayEl = document.createElement("div");
		this.tabDragOverlayEl.classList.add("studio-window-tab-drag-overlay");
		this.el.appendChild(this.tabDragOverlayEl);

		this.lastTabDragOverlayBoundingRect = null;

		this.boundOnTabDragOver = this.onTabDragOver.bind(this);
		this.tabDragOverlayEl.addEventListener("dragover", this.boundOnTabDragOver);
		this.boundOnTabDrop = this.onTabDrop.bind(this);
		this.tabDragOverlayEl.addEventListener("drop", this.boundOnTabDrop);

		this.isInit = false;

		this.setTabDragOverlayEnabled(false);
	}

	init() {
		this.isInit = true;

		for (const contentWindow of this.tabs) {
			this.initContentWindow(contentWindow);
		}
	}

	destructor() {
		this.#intendedTabTypes = [];
		const tabs = this.tabs;
		this.tabs = [];
		for (const tab of tabs) {
			this.destructContentWindow(tab);
		}
		this.tabsSelectorGroup.destructor();
		super.destructor();
	}

	updateEls() {
		this.updateTabSelectorSpacer();
	}

	/**
	 * @param {number} index
	 * @param {string} tabType
	 * @param {import("../../../src/util/mod.js").UuidString} uuid
	 * @param {import("./StudioWindow.js").WorkspaceChangeTrigger} trigger
	 * @returns {ContentWindow?}
	 */
	setTabType(index, tabType, uuid, trigger) {
		this.#intendedTabTypes[index] = tabType;
		this.#intendedTabUuids[index] = uuid;
		const constructor = this.windowManager.getContentWindowConstructorByType(tabType);
		if (constructor) {
			return this.loadContentWindow(index, constructor, uuid, trigger);
		}
		return null;
	}

	/**
	 * @param {string} tabType The id of the tab type to create.
	 * @param {boolean} activate Whether to set the tab as active.
	 * @param {import("./StudioWindow.js").WorkspaceChangeTrigger} trigger
	 * @returns {ContentWindow?}
	 */
	addTabType(tabType, trigger, activate = false) {
		const index = this.#intendedTabTypes.length;
		const contentWindow = this.setTabType(index, tabType, generateUuid(), trigger);
		if (activate) {
			this.setActiveTabIndex(index, trigger);
		}
		this.fireWorkspaceChangeCbs({trigger});
		return contentWindow;
	}

	/**
	 * @param {number} tabIndex
	 * @param {import("./StudioWindow.js").WorkspaceChangeTrigger} trigger
	 */
	closeTab(tabIndex, trigger) {
		const contentWindow = this.tabs[tabIndex];
		this.tabsEl.removeChild(contentWindow.el);
		this.tabs.splice(tabIndex, 1);
		this.#intendedTabTypes.splice(tabIndex, 1);
		this.#updateTabSelector(trigger);
		this.destructContentWindow(contentWindow);
		this.fireWorkspaceChangeCbs({trigger});
	}

	/**
	 * @override
	 * @param {ContentWindowConstructor} constructor
	 * @param {import("./StudioWindow.js").WorkspaceChangeTrigger} trigger
	 */
	onContentWindowRegistered(constructor, trigger) {
		for (let i = 0; i < this.#intendedTabTypes.length; i++) {
			if (this.#intendedTabTypes[i] == constructor.contentWindowTypeId) {
				let uuid = this.#intendedTabUuids[i];
				if (!uuid) uuid = generateUuid();
				this.loadContentWindow(i, constructor, uuid, trigger);
			}
		}
	}

	/**
	 * @template {ContentWindow} T
	 * @param {number} index
	 * @param {new (...args: ConstructorParameters<ContentWindowConstructor>) => T} constructor
	 * @param {import("../../../src/util/mod.js").UuidString} uuid
	 * @param {import("./StudioWindow.js").WorkspaceChangeTrigger} trigger
	 * @returns {T}
	 */
	loadContentWindow(index, constructor, uuid, trigger) {
		const contentWindow = new constructor(getStudioInstance(), this.windowManager, uuid);
		this.#setExistingContentWindow(index, contentWindow, trigger);
		if (this.isInit) {
			this.initContentWindow(contentWindow);
			contentWindow.fireOnWindowResize();
		}
		return contentWindow;
	}

	/**
	 * @param {ContentWindow} contentWindow
	 */
	initContentWindow(contentWindow) {
		contentWindow.init();
		const castConstructor = /** @type {ContentWindowConstructor} */ (contentWindow.constructor);
		this.windowManager.contentWindowAddedHandler.fireEvent(castConstructor, {
			target: contentWindow,
		});
	}

	/**
	 * @param {ContentWindow} contentWindow
	 */
	destructContentWindow(contentWindow) {
		contentWindow.destructor();
		const castConstructor = /** @type {ContentWindowConstructor} */ (contentWindow.constructor);
		this.windowManager.contentWindowRemovedHandler.fireEvent(castConstructor, {
			target: contentWindow,
		});
	}

	/**
	 * @param {number} index
	 * @param {ContentWindow} contentWindow
	 * @param {import("./StudioWindow.js").WorkspaceChangeTrigger} trigger
	 */
	#setExistingContentWindow(index, contentWindow, trigger) {
		if (this.tabs[index]) throw new Error("Replacing existing content windows is not yet implemented.");
		contentWindow.detachParentStudioWindow(trigger);
		contentWindow.attachParentStudioWindow(this);
		this.tabs[index] = contentWindow;
		const castConstructor = /** @type {ContentWindowConstructor} */ (contentWindow.constructor);
		this.#intendedTabTypes[index] = castConstructor.contentWindowTypeId;
		this.tabsEl.appendChild(contentWindow.el);
		this.#updateTabSelector(trigger);
	}

	/**
	 * @param {ContentWindow} contentWindow
	 * @param {import("./StudioWindow.js").WorkspaceChangeTrigger} trigger
	 * @param {boolean} [activate]
	 */
	#addExistingContentWindow(contentWindow, trigger, activate = true) {
		const index = this.#intendedTabTypes.length;
		this.#setExistingContentWindow(index, contentWindow, trigger);
		if (activate) {
			this.setActiveTabIndex(index, trigger);
		}
		this.fireWorkspaceChangeCbs({trigger});
	}

	/**
	 * @param {ContentWindow} contentWindow
	 * @param {import("./StudioWindow.js").WorkspaceChangeTrigger} trigger
	 */
	contentWindowDetached(contentWindow, trigger) {
		const index = this.tabs.indexOf(contentWindow);
		if (index >= 0) {
			this.tabs.splice(index, 1);
			this.#intendedTabTypes.splice(index, 1);
			this.#updateTabSelector(trigger);
			if (this.#intendedTabTypes.length == 0) {
				this.unsplitParent(trigger);
			}
			this.fireWorkspaceChangeCbs({trigger});
		}
	}

	/**
	 * @param {import("./StudioWindow.js").WorkspaceChangeTrigger} trigger
	 */
	#updateTabSelector(trigger) {
		const prevTabCount = this.tabsSelectorGroup.buttons.length;
		const deltaCount = this.tabs.length - prevTabCount;
		if (deltaCount > 0) {
			for (let i = 0; i < deltaCount; i++) {
				const tabIndex = prevTabCount + i;
				const contentWindow = this.tabs[tabIndex];
				const newButton = new Button({
					colorizerFilterManager: getStudioInstance().colorizerFilterManager,
					onClick: () => {
						this.setActiveTabIndex(tabIndex, "user");
					},
					draggable: true,
					onDragStart: e => {
						if (!e.dataTransfer) return;
						this.windowManager.setTabDragEnabled(true);
						e.dataTransfer.effectAllowed = "move";
						e.dataTransfer.setData("text/renda; dragtype=studiowindowtab", contentWindow.uuid);
					},
					onDragEnd: () => {
						this.windowManager.setTabDragEnabled(false);
					},
				});
				this.tabsSelectorGroup.addButton(newButton);
			}
		} else if (deltaCount < 0) {
			for (let i = this.tabsSelectorGroup.buttons.length - 1; i >= this.tabs.length; i--) {
				this.tabsSelectorGroup.removeButton(i);
			}
		}
		if (deltaCount != 0) {
			this.updateTabSelectorSpacer();
		}

		if (this.activeTabIndex >= this.tabs.length) {
			this.setActiveTabIndex(this.tabs.length - 1, trigger);
		}

		for (let i = 0; i < this.tabs.length; i++) {
			const contentWindowType = /** @type {ContentWindowConstructor} */ (this.tabs[i].constructor);
			const button = this.tabsSelectorGroup.buttons[i];
			button.setIcon(contentWindowType.contentWindowUiIcon);
			button.setTooltip(contentWindowType.contentWindowUiName);
		}
	}

	updateTabSelectorSpacer() {
		const [w, h] = getElementSize(this.tabsSelectorGroup.el);
		for (const tab of this.tabs) {
			tab.updateTabSelectorSpacer(w, h);
		}
	}

	/**
	 * @param {number} index
	 * @param {import("./StudioWindow.js").WorkspaceChangeTrigger} trigger
	 */
	setActiveTabIndex(index, trigger) {
		this.activeTabIndex = index;
		for (let i = 0; i < this.tabs.length; i++) {
			const active = i == index;
			this.tabsSelectorGroup.buttons[i].setSelectedHighlight(active);
			this.tabs[i].setVisibilityFromTabWindow(active);
		}
		this.fireActiveTabChange();
		this.fireWorkspaceChangeCbs({trigger});
	}

	/**
	 * @param {ContentWindow} contentWindow
	 * @param {import("./StudioWindow.js").WorkspaceChangeTrigger} trigger
	 */
	setActiveContentWindow(contentWindow, trigger) {
		const index = this.tabs.indexOf(contentWindow);
		this.setActiveTabIndex(index, trigger);
	}

	get activeTab() {
		return this.tabs[this.activeTabIndex];
	}

	/**
	 * @param {boolean} enabled
	 */
	setTabDragOverlayEnabled(enabled) {
		this.tabDragOverlayEl.style.display = enabled ? "" : "none";
		if (enabled) {
			this.lastTabDragOverlayBoundingRect = this.tabDragOverlayEl.getBoundingClientRect();
		} else {
			this.lastTabDragOverlayBoundingRect = null;
		}
	}

	onResized() {
		for (const tab of this.tabs) {
			tab.fireOnWindowResize();
		}
	}

	/**
	 * @param {Button} button
	 * @param {MouseEvent} e
	 */
	onTabsContextMenu(button, e) {
		e.preventDefault();

		/** @type {import("../ui/popoverMenus/ContextMenu.js").ContextMenuStructure} */
		const addTabSubmenu = [];
		for (const [id, contentWindow] of this.windowManager.registeredContentWindows) {
			let text = "<ContentWindow>";
			let icon = null;
			if (contentWindow.contentWindowUiName) {
				text = contentWindow.contentWindowUiName;
				icon = contentWindow.contentWindowUiIcon;
			} else if (contentWindow.contentWindowTypeId) {
				text = "<" + contentWindow.contentWindowTypeId + ">";
			}
			addTabSubmenu.push({
				text, icon,
				onClick: () => {
					this.addTabType(id, "user", true);
				},
			});
		}

		/** @type {import("../ui/popoverMenus/ContextMenu.js").ContextMenuStructure} */
		const contextMenuStructure = [
			{
				text: "Close Tab",
				disabled: this.tabs.length <= 1 && this.isRoot,
				onClick: () => {
					const index = this.tabsSelectorGroup.buttons.indexOf(button);
					this.closeTab(index, "user");
					if (this.tabs.length == 0) {
						this.unsplitParent("user");
					}
				},
			},
			{
				text: "Add Tab",
				submenu: addTabSubmenu,
			},
			{
				text: "Workspaces",
				submenu: async () => {
					/** @type {import("../ui/popoverMenus/ContextMenu.js").ContextMenuStructure} */
					const workspacesSubmenu = [];

					const currentWorkspace = await this.windowManager.workspaceManager.getCurrentWorkspaceId();

					const workspaces = await this.windowManager.workspaceManager.getWorkspacesList();
					for (const workspaceId of workspaces) {
						const isCurrentWorkspace = workspaceId == currentWorkspace;
						workspacesSubmenu.push({
							text: workspaceId,
							reserveIconSpace: true,
							showBullet: isCurrentWorkspace,
							submenu: async () => {
								/** @type {import("../ui/popoverMenus/ContextMenu.js").ContextMenuStructure} */
								const submenu = [];
								if (!isCurrentWorkspace) {
									submenu.push({
										text: "Activate",
										onClick: () => {
											this.windowManager.workspaceManager.setCurrentWorkspaceId(workspaceId);
										},
									});
								}
								if (isCurrentWorkspace) {
									let autoSaveValue = await this.windowManager.workspaceManager.getCurrentWorkspaceAutoSaveValue();
									submenu.push(
										{
											text: "Save",
											onClick: () => {
												this.windowManager.saveActiveWorkspace();
											},
										},
										{
											text: "Autosave",
											reserveIconSpace: true,
											showCheckmark: autoSaveValue,
											onClick: e => {
												e.preventMenuClose();
												autoSaveValue = !autoSaveValue;
												e.item.showCheckmark = autoSaveValue;
												this.windowManager.workspaceManager.setCurrentWorkspaceAutoSaveValue(autoSaveValue);
											},
										}
									);
								}
								submenu.push(
									{
										text: "Clone",
										onClick: () => {
											this.windowManager.workspaceManager.cloneWorkspace(workspaceId);
										},
									},
									{
										text: "Delete",
										disabled: workspaces.length <= 1,
										onClick: () => {
											this.windowManager.workspaceManager.deleteWorkspace(workspaceId);
										},
									}
								);
								if (isCurrentWorkspace) {
									submenu.push({
										text: "Revert to Saved State",
										onClick: () => {
											this.windowManager.workspaceManager.revertCurrentWorkspace();
										},
									});
								}
								return submenu;
							},
						});
					}

					workspacesSubmenu.push(
						{
							horizontalLine: true,
						},
						{
							text: "Add New Workspace",
							onClick: () => {
								const name = prompt("Enter Workspace Name", "New Workspace");
								if (name && !workspaces.includes(name)) {
									this.windowManager.workspaceManager.addNewWorkspace(name);
								}
							},
						}
					);

					return workspacesSubmenu;
				},
			},
		];

		const menu = getStudioInstance().popoverManager.createContextMenu(contextMenuStructure);
		menu.setPos(e);
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @returns {"center" | "left" | "right" | "top" | "bottom"}
	 */
	getTabDragPosition(x, y) {
		if (!this.lastTabDragOverlayBoundingRect) {
			throw new Error("Unable to get tab drag position, tab drag overlay is not enabled.");
		}
		const rect = this.lastTabDragOverlayBoundingRect;
		const percentX = iLerp(rect.left, rect.right, x);
		const percentY = iLerp(rect.top, rect.bottom, y);

		if (percentX > 0.25 && percentX < 0.75 && percentY > 0.25 && percentY < 0.75) {
			return "center";
		}
		/** @type {"left" | "right" | "top" | "bottom"} */
		let closestEdge = "left";
		/** @type {Array<{edge: "left" | "right" | "top" | "bottom", dist: number}>} */
		const edges = [
			{
				edge: "left",
				dist: percentX,
			},
			{
				edge: "right",
				dist: 1 - percentX,
			},
			{
				edge: "top",
				dist: percentY,
			},
			{
				edge: "bottom",
				dist: 1 - percentY,
			},
		];

		let closestEdgeDist = 1;
		for (const edge of edges) {
			if (edge.dist < closestEdgeDist) {
				closestEdgeDist = edge.dist;
				closestEdge = edge.edge;
			}
		}
		return closestEdge;
	}

	/**
	 * @param {DragEvent} e
	 */
	onTabDragOver(e) {
		if (!e.dataTransfer) return;
		if (!e.dataTransfer.types.some(mimeType => this.validateTabDragMimeType(mimeType))) return;
		if (!this.lastTabDragOverlayBoundingRect) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		const dragPosition = this.getTabDragPosition(e.pageX, e.pageY);
		let {left, top, width, height} = this.lastTabDragOverlayBoundingRect;
		if (dragPosition == "left") {
			width /= 2;
		} else if (dragPosition == "right") {
			width /= 2;
			left += width;
		} else if (dragPosition == "top") {
			height /= 2;
		} else if (dragPosition == "bottom") {
			height /= 2;
			top += height;
		}
		this.windowManager.setTabDragFeedbackRect(left, top, width, height);
	}

	/**
	 * @param {string} mimeType
	 * @returns {boolean}
	 */
	validateTabDragMimeType(mimeType) {
		const parsed = parseMimeType(mimeType);
		if (!parsed) return false;
		const {type, subType, parameters} = parsed;
		if (type != "text" || subType != "renda" || parameters.dragtype != "studiowindowtab") return false;
		return true;
	}

	/**
	 * @param {string[]} uuids
	 * @param {boolean} [fromOtherTabsOnly]
	 */
	*uuidsToContentWindows(uuids, fromOtherTabsOnly = false) {
		for (const uuid of uuids) {
			if (fromOtherTabsOnly && this.tabs.some(tab => tab.uuid == uuid)) continue;
			const contentWindow = this.windowManager.getContentWindowByUuid(uuid);
			if (contentWindow) {
				yield contentWindow;
			}
		}
	}

	/**
	 * @param {DragEvent} e
	 */
	async onTabDrop(e) {
		if (!e.dataTransfer) return;
		const dragPosition = this.getTabDragPosition(e.pageX, e.pageY);
		const tabUuidPromisess = Array.from(e.dataTransfer.items).filter(item => {
			if (item.kind != "string") return false;
			return this.validateTabDragMimeType(item.type);
		}).map(item => {
			return new Promise(r => item.getAsString(r));
		});
		const tabUuids = await Promise.all(tabUuidPromisess);
		if (dragPosition == "center") {
			for (const contentWindow of this.uuidsToContentWindows(tabUuids, true)) {
				this.#addExistingContentWindow(contentWindow, "user");
			}
		} else {
			const splitHorizontal = dragPosition == "top" || dragPosition == "bottom";
			const createdTabWindow = this.splitWindow(dragPosition, splitHorizontal, "user");
			for (const contentWindow of this.uuidsToContentWindows(tabUuids)) {
				createdTabWindow.#addExistingContentWindow(contentWindow, "user");
			}
		}
	}

	/**
	 * @param {"left" | "right" | "top" | "bottom"} emptySide
	 * @param {boolean} splitHorizontal
	 * @param {import("./StudioWindow.js").WorkspaceChangeTrigger} trigger
	 */
	splitWindow(emptySide, splitHorizontal, trigger) {
		const newSplitWindow = new SplitStudioWindow(this.windowManager);
		newSplitWindow.splitHorizontal = splitHorizontal;

		const newTabWindow = new TabsStudioWindow(this.windowManager);
		const oldParent = this.parent;
		if (emptySide == "left" || emptySide == "top") {
			newSplitWindow.setWindows(newTabWindow, this);
		} else if (emptySide == "right" || emptySide == "bottom") {
			newSplitWindow.setWindows(this, newTabWindow);
		} else {
			throw new Error("Invalid emptySide value");
		}

		if (this.isRoot) {
			this.windowManager.replaceRootWindow(newSplitWindow, trigger, false);
		} else if (oldParent && oldParent instanceof SplitStudioWindow) {
			oldParent.replaceWindow(this, newSplitWindow, "user");
		}
		return newTabWindow;
	}

	/**
	 * @param {import("./StudioWindow.js").WorkspaceChangeTrigger} trigger
	 */
	unsplitParent(trigger) {
		if (this.parent && this.parent instanceof SplitStudioWindow) {
			this.parent.unsplitWindow(this, trigger);
		}
	}

	/**
	 * @param {() => void} cb
	 */
	onTabChange(cb) {
		this.onTabChangeCbs.add(cb);
	}

	fireActiveTabChange() {
		for (const cb of this.onTabChangeCbs) {
			cb();
		}
	}
}
