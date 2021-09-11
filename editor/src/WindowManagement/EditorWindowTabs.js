import EditorWindow from "./EditorWindow.js";
import {getElemSize, iLerp, parseMimeType} from "../Util/Util.js";
import editor from "../editorInstance.js";
import Button from "../UI/Button.js";
import ButtonGroup from "../UI/ButtonGroup.js";
import EditorWindowSplit from "./EditorWindowSplit.js";

export default class EditorWindowTabs extends EditorWindow {
	constructor() {
		super();

		this.el.classList.add("editorWindowTabs");

		/** @type {Array<string>} */
		this.tabTypes = [];
		/** @type {Array<import("./ContentWindows/ContentWindow.js").default>} */
		this.tabs = [];
		this.activeTabIndex = -1;

		this.tabsSelectorGroup = new ButtonGroup();
		this.tabsSelectorGroup.el.classList.add("editorWindowTabButtonGroup");
		this.el.appendChild(this.tabsSelectorGroup.el);

		this.boundOnTabsContextMenu = this.onTabsContextMenu.bind(this);
		this.tabsSelectorGroup.onContextMenu(this.boundOnTabsContextMenu);

		this.tabsEl = document.createElement("div");
		this.tabsEl.classList.add("editorWindowTabsList");
		this.el.appendChild(this.tabsEl);

		this.tabDragOverlayEl = document.createElement("div");
		this.tabDragOverlayEl.classList.add("editorWindowTabDragOverlay");
		this.el.appendChild(this.tabDragOverlayEl);

		this.lastTabDragOverlayBoundingRect = null;

		this.boundOnTabDragOver = this.onTabDragOver.bind(this);
		this.tabDragOverlayEl.addEventListener("dragover", this.boundOnTabDragOver);
		this.boundOnTabDrop = this.onTabDrop.bind(this);
		this.tabDragOverlayEl.addEventListener("drop", this.boundOnTabDrop);

		this.setTabDragOverlayEnabled(false);
	}

	destructor() {
		this.tabTypes = null;
		for (const tab of this.tabs) {
			tab.destructor();
		}
		this.tabs = null;
		this.tabsSelectorGroup.destructor();
		this.tabsSelectorGroup = null;
		this.tabsEl = null;
		super.destructor();
	}

	updateEls() {
		this.updateTabSelectorSpacer();
	}

	/**
	 * @param {Number} index
	 * @param {String} tabType
	 * @returns {?import("./ContentWindows/ContentWindow.js").default}
	 */
	setTabType(index, tabType) {
		this.tabTypes[index] = tabType;
		const constructor = editor.windowManager.getContentWindowConstructorByType(tabType);
		if (constructor) {
			return this.loadContentWindow(index, constructor);
		}
		return null;
	}

	/**
	 * @param {String} tabType The id of the tab type to create.
	 * @param {Boolean} activate Whether to set the tab as active.
	 * @returns {?import("./ContentWindows/ContentWindow.js").default}
	 */
	addTabType(tabType, activate = false) {
		const index = this.tabTypes.length;
		const contentWindow = this.setTabType(index, tabType);
		if (activate) {
			this.setActiveTabIndex(index);
		}
		this.fireWorkspaceChangeCbs();
		return contentWindow;
	}

	/**
	 * @param {number} tabIndex
	 */
	closeTab(tabIndex) {
		const contentWindow = this.tabs[tabIndex];
		contentWindow.destructor();
		this.tabs.splice(tabIndex, 1);
		this.tabTypes.splice(tabIndex, 1);
		this.updateTabSelector();
		this.fireWorkspaceChangeCbs();
	}

	/**
	 * @param {typeof import("./ContentWindows/ContentWindow.js").default} constructor
	 */
	onContentWindowRegistered(constructor) {
		for (let i = 0; i < this.tabTypes.length; i++) {
			if (this.tabTypes[i] == constructor.contentWindowTypeId) {
				this.loadContentWindow(i, constructor);
			}
		}
	}

	/**
	 * @param {number} index
	 * @param {typeof import("./ContentWindows/ContentWindow.js").default} constructor
	 * @returns
	 */
	loadContentWindow(index, constructor) {
		const contentWindow = new constructor();
		this.setExistingContentWindow(index, contentWindow);
		return contentWindow;
	}

	/**
	 * @param {number} index
	 * @param {import("./ContentWindows/ContentWindow.js").default} contentWindow
	 */
	setExistingContentWindow(index, contentWindow) {
		if (this.tabs[index]) throw new Error("nyi");
		contentWindow.detachParentEditorWindow();
		contentWindow.attachParentEditorWindow(this);
		this.tabs[index] = contentWindow;
		const castConstructor = /** @type {typeof import("./ContentWindows/ContentWindow.js").default} */ (contentWindow.constructor);
		this.tabTypes[index] = castConstructor.contentWindowTypeId;
		this.tabsEl.appendChild(contentWindow.el);
		this.updateTabSelector();
	}

	/**
	 * @param {import("./ContentWindows/ContentWindow.js").default} contentWindow
	 * @param {boolean} [activate = true]
	 */
	addExistingContentWindow(contentWindow, activate = true) {
		const index = this.tabTypes.length;
		this.setExistingContentWindow(index, contentWindow);
		if (activate) {
			this.setActiveTabIndex(index);
		}
		this.fireWorkspaceChangeCbs();
	}

	/**
	 * @param {import("./ContentWindows/ContentWindow.js").default} contentWindow
	 */
	contentWindowDetached(contentWindow) {
		const index = this.tabs.indexOf(contentWindow);
		if (index >= 0) {
			this.tabs.splice(index, 1);
			this.tabTypes.splice(index, 1);
			this.updateTabSelector();
			this.fireWorkspaceChangeCbs();
		}
	}

	updateTabSelector() {
		const prevTabCount = this.tabsSelectorGroup.buttons.length;
		const deltaCount = this.tabs.length - prevTabCount;
		if (deltaCount > 0) {
			for (let i = 0; i < deltaCount; i++) {
				const tabIndex = prevTabCount + i;
				const contentWindow = this.tabs[tabIndex];
				const newButton = new Button({
					onClick: () => {
						this.setActiveTabIndex(tabIndex);
					},
					draggable: true,
					onDragStart: e => {
						editor.windowManager.setTabDragOverlayEnabled(true);
						e.dataTransfer.effectAllowed = "move";
						e.dataTransfer.setData("text/jj; dragtype=editorwindowtab", contentWindow.uuid);
					},
					onDragEnd: () => {
						editor.windowManager.setTabDragOverlayEnabled(false);
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
			this.setActiveTabIndex(this.tabs.length - 1);
		}

		for (let i = 0; i < this.tabs.length; i++) {
			const contentWindowType = /** @type {typeof import("./ContentWindows/ContentWindow.js").default} */ (this.tabs[i].constructor);
			this.tabsSelectorGroup.buttons[i].setIcon(contentWindowType.contentWindowUiIcon);
		}
	}

	updateTabSelectorSpacer() {
		const [w, h] = getElemSize(this.tabsSelectorGroup.el);
		for (const tab of this.tabs) {
			tab.updateTabSelectorSpacer(w, h);
		}
	}

	setActiveTabIndex(index) {
		this.activeTabIndex = index;
		for (let i = 0; i < this.tabs.length; i++) {
			const active = i == index;
			this.tabsSelectorGroup.buttons[i].setSelectedHighlight(active);
			this.tabs[i].setVisible(active);
		}
		this.fireWorkspaceChangeCbs();
	}

	setActiveContentWindow(contentWindow) {
		const index = this.tabs.indexOf(contentWindow);
		this.setActiveTabIndex(index);
	}

	get activeTab() {
		return this.tabs[this.activeTabIndex];
	}

	/**
	 * @param {boolean} enabled
	 */
	setTabDragOverlayEnabled(enabled) {
		this.tabDragOverlayEl.style.display = enabled ? null : "none";
		if (enabled) {
			this.lastTabDragOverlayBoundingRect = this.tabDragOverlayEl.getBoundingClientRect();
		}
	}

	onResized() {
		for (const tab of this.tabs) {
			tab.onResized();
		}
	}

	onTabsContextMenu(button, e) {
		e.preventDefault();

		/** @type {import("../UI/ContextMenus/ContextMenu.js").ContextMenuStructure} */
		const addTabSubmenu = [];
		for (const [id, contentWindow] of editor.windowManager.registeredContentWindows) {
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
					this.addTabType(id, true);
				},
			});
		}

		/** @type {import("../UI/ContextMenus/ContextMenu.js").ContextMenuStructure} */
		const contextMenuStructure = [
			{
				text: "Close Tab",
				disabled: this.tabs.length <= 1 && this.isRoot,
				onClick: () => {
					const index = this.tabsSelectorGroup.buttons.indexOf(button);
					this.closeTab(index);
					if (this.tabs.length == 0) {
						if (this.parent && this.parent instanceof EditorWindowSplit) {
							this.parent.unsplitWindow(this);
						}
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
					/** @type {import("../UI/ContextMenus/ContextMenu.js").ContextMenuStructure} */
					const workspacesSubmenu = [];

					const currentWorkspace = await editor.windowManager.workspaceManager.getCurrentWorkspaceId();

					const workspaces = await editor.windowManager.workspaceManager.getWorkspacesList();
					for (const workspaceId of workspaces) {
						workspacesSubmenu.push({
							text: workspaceId,
							reserveIconSpace: true,
							showBullet: workspaceId == currentWorkspace,
							onClick: () => {
								editor.windowManager.workspaceManager.setCurrentWorkspaceId(workspaceId);
							},
						});
					}

					let autoSaveValue = await editor.windowManager.workspaceManager.getAutoSaveValue();

					workspacesSubmenu.push(
						{
							horizontalLine: true,
						},
						{
							text: "Add New Workspace",
							onClick: () => {
								const name = prompt("Enter Workspace Name", `Copy of ${currentWorkspace}`);
								if (name && !workspaces.includes(name)) {
									editor.windowManager.workspaceManager.addNewWorkspace(name);
								}
							},
						},
						{
							text: `Save '${currentWorkspace}'`,
							onClick: () => {
								editor.windowManager.saveWorkspace();
							},
						},
						{
							text: `Autosave '${currentWorkspace}'`,
							reserveIconSpace: true,
							showCheckmark: autoSaveValue,
							onClick: e => {
								e.preventMenuClose();
								autoSaveValue = !autoSaveValue;
								e.item.showCheckmark = autoSaveValue;
								editor.windowManager.workspaceManager.setAutoSaveValue(autoSaveValue);
							},
						},
						{
							text: `Delete '${currentWorkspace}'`,
							disabled: workspaces.length <= 1,
							onClick: () => {
								editor.windowManager.workspaceManager.deleteCurrentWorkspace();
							},
						}
					);

					return workspacesSubmenu;
				},
			},
		];

		const menu = editor.contextMenuManager.createContextMenu(contextMenuStructure);
		menu.setPos(e.pageX, e.pageY);
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @returns {"center" | "left" | "right" | "top" | "bottom"}
	 */
	getTabDragPosition(x, y) {
		const rect = this.lastTabDragOverlayBoundingRect;
		const percentX = iLerp(rect.left, rect.right, x);
		const percentY = iLerp(rect.top, rect.bottom, y);

		if (percentX > 0.25 && percentX < 0.75 && percentY > 0.25 && percentY < 0.75) {
			return "center";
		}
		/** @type {"left" | "right" | "top" | "bottom"} */
		let closestEdge = null;
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
		if (!e.dataTransfer.types.some(mimeType => this.validateTabDragMimeType(mimeType))) return;
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
		editor.windowManager.setTabDragFeedbackRect(left, top, width, height);
	}

	/**
	 * @param {string} mimeType
	 * @returns {boolean}
	 */
	validateTabDragMimeType(mimeType) {
		const parsed = parseMimeType(mimeType);
		if (!parsed) return false;
		const {type, subType, params} = parsed;
		if (type != "text" || subType != "jj" || params.dragtype != "editorwindowtab") return false;
		return true;
	}

	/**
	 * @param {DragEvent} e
	 */
	async onTabDrop(e) {
		const dragPosition = this.getTabDragPosition(e.pageX, e.pageY);
		const tabUuidPromisess = Array.from(e.dataTransfer.items).filter(item => {
			if (item.kind != "string") return false;
			return this.validateTabDragMimeType(item.type);
		}).map(item => {
			return new Promise(r => item.getAsString(r));
		});
		const tabUuids = await Promise.all(tabUuidPromisess);
		if (dragPosition == "center") {
			const tabUuidsFromOtherTab = tabUuids.filter(uuid => !this.tabs.some(tab => tab.uuid == uuid));
			for (const uuid of tabUuidsFromOtherTab) {
				const contentWindow = editor.windowManager.getContentWindowByUuid(uuid);
				if (contentWindow) {
					this.addExistingContentWindow(contentWindow);
				}
			}
		}
	}
}
