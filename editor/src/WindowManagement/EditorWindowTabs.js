import EditorWindow from "./EditorWindow.js";
import {getElemSize} from "../Util/Util.js";
import editor from "../editorInstance.js";
import Button from "../UI/Button.js";
import ButtonGroup from "../UI/ButtonGroup.js";

export default class EditorWindowTabs extends EditorWindow{
	constructor(){
		super();

		this.el.classList.add("editorWindowTabs");

		this.tabTypes = [];
		this.tabs = [];
		this.activeTabIndex = -1;

		this.tabsSelectorGroup = new ButtonGroup();
		this.tabsSelectorGroup.el.classList.add("editorWindowTabButtonGroup")
		this.el.appendChild(this.tabsSelectorGroup.el);

		this.boundOnTabsContextMenu = this.onTabsContextMenu.bind(this);
		this.tabsSelectorGroup.onContextMenu(this.boundOnTabsContextMenu);

		this.tabsEl = document.createElement("div");
		this.tabsEl.classList.add("editorWindowTabsList");
		this.el.appendChild(this.tabsEl);
	}

	destructor(){
		this.tabTypes = null;
		for(const tab of this.tabs){
			tab.destructor();
		}
		this.tabs = null;
		this.tabsSelectorGroup.destructor();
		this.tabsSelectorGroup = null;
		this.tabsEl = null;
		super.destructor();
	}

	updateEls(){
		this.updateTabSelectorSpacer();
	}

	/**
	 * @param {Number} index
	 * @param {String} tabType
	 * @returns {?import("./ContentWindows/ContentWindow.js").default}
	 */
	setTabType(index, tabType){
		this.tabTypes[index] = tabType;
		let constructor = editor.windowManager.getContentWindowConstructorByType(tabType);
		if(constructor){
			return this.loadContentWindow(index, constructor);
		}
		return null;
	}

	/**
	 * @param {String} tabType
	 * @returns {?import("./ContentWindows/ContentWindow.js").default}
	 */
	addTabType(tabType){
		return this.setTabType(this.tabTypes.length, tabType);
	}

	closeTab(tabIndex) {
		const contentWindow = this.tabs[tabIndex];
		contentWindow.destructor();
		this.tabs.splice(tabIndex, 1);
		this.tabTypes.splice(tabIndex, 1);
		this.tabsSelectorGroup.removeButton(tabIndex);

		if (this.activeTabIndex == tabIndex) {
			this.setActiveTabIndex(0);
		}
	}

	/**
	 * @param {typeof import("./ContentWindows/ContentWindow.js").default} constructor
	 */
	onContentWindowRegistered(constructor){
		for(let i=0; i<this.tabTypes.length; i++){
			if(this.tabTypes[i] == constructor.contentWindowTypeId){
				this.loadContentWindow(i, constructor);
			}
		}
	}

	loadContentWindow(index, constructor){
		const contentWindow = new constructor(this);
		this.tabs[index] = contentWindow;
		this.tabsEl.appendChild(contentWindow.el);
		this.updateTabSelector();
		return contentWindow;
	}

	updateTabSelector(){
		let prevTabCount = this.tabsSelectorGroup.buttons.length;
		let deltaCount = this.tabs.length - prevTabCount;
		if(deltaCount > 0){
			for(let i=0; i<deltaCount; i++){
				let tabIndex = prevTabCount + i;
				let newButton = new Button({
					onClick: () => {
						this.setActiveTabIndex(tabIndex);
					}
				});
				this.tabsSelectorGroup.addButton(newButton);
			}
		}else if(deltaCount < 0){
			//todo
		}
		if(deltaCount != 0){
			this.updateTabSelectorSpacer();
		}
	}

	updateTabSelectorSpacer(){
		let [w,h] = getElemSize(this.tabsSelectorGroup.el);
		for(const tab of this.tabs){
			tab.updateTabSelectorSpacer(w, h);
		}
	}

	setActiveTabIndex(index){
		this.activeTabIndex = index;
		for(let i=0; i<this.tabs.length; i++){
			let active = i == index;
			this.tabsSelectorGroup.buttons[i].setSelectedHighlight(active);
			this.tabs[i].setVisible(active);
		}
	}

	setActiveContentWindow(contentWindow){
		const index = this.tabs.indexOf(contentWindow);
		this.setActiveTabIndex(index);
	}

	get activeTab(){
		return this.tabs[this.activeTabIndex];
	}

	onResized(){
		for(const tab of this.tabs){
			tab.onResized();
		}
	}

	onTabsContextMenu(button, e) {
		e.preventDefault();

		/** @type {import("../UI/ContextMenus/ContextMenu.js").ContextMenuStructure} */
		const contextMenuStructure = [
			{
				text: "Close Tab",
				onClick: () => {
					const index = this.tabsSelectorGroup.buttons.indexOf(button);
					this.closeTab(index);
					if (this.tabs.length == 0) {
						// todo: close EditorWindow
					}
				}
			},
		];

		const menu = editor.contextMenuManager.createContextMenu(contextMenuStructure);
		menu.setPos(e.pageX, e.pageY);
	}
}
