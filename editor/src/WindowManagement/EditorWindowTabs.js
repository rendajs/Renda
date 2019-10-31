import EditorWindow from "./EditorWindow.js";
import {getElemSize} from "../Util/Util.js";
import editor from "../editorInstance.js";

export default class EditorWindowTabs extends EditorWindow{
	constructor(){
		super();

		this.el.classList.add("editorWindowTabs");

		this.tabTypes = [];
		this.tabs = [];

		this.tabsSelectorEl = document.createElement("div");
		this.tabsSelectorEl.classList.add("editorWindowTabSelector");
		this.el.appendChild(this.tabsSelectorEl);

		this.tabsEl = document.createElement("div");
		this.el.appendChild(this.tabsEl);
	}

	updateEls(){
		this.updateTabSelectorSpacer();
	}

	setTabType(index, tabType){
		this.tabTypes[index] = tabType;
		let constructor = editor.windowManager.getContentWindowConstructorByType(tabType);
		if(constructor){
			this.loadContentWindow(index, constructor);
		}
	}

	onContentWindowRegistered(constructor){
		for(let i=0; i<this.tabTypes.length; i++){
			if(this.tabTypes[i] == constructor.windowName){
				this.loadContentWindow(i, constructor);
			}
		}
	}

	loadContentWindow(index, constructor){
		let contentWindow = new constructor();
		this.tabs[index] = contentWindow;
		this.tabsEl.appendChild(contentWindow.el);
		this.updateTabSelector();
	}

	updateTabSelector(){
		let prevTabCount = this.tabsSelectorEl.childElementCount;
		let deltaCount = this.tabs.length - prevTabCount;
		if(deltaCount > 0){
			for(let i=0; i<deltaCount; i++){
				let newEl = document.createElement("div");
				newEl.classList.add("editorWindowTabSelectorTab");
				let tabIndex = prevTabCount + i;
				newEl.addEventListener("click", _ => {
					this.setActiveTab(tabIndex);
				});
				this.tabsSelectorEl.appendChild(newEl);
			}
		}else if(deltaCount < 0){
			//todo
		}
		if(deltaCount != 0){
			this.updateTabSelectorSpacer();
		}
	}

	updateTabSelectorSpacer(){
		let [w,h] = getElemSize(this.tabsSelectorEl);
		for(const tab of this.tabs){
			tab.updateTabSelectorSpacer(w, h);
		}
	}

	setActiveTab(index){
		for(let i=0; i<this.tabs.length; i++){
			let active = i == index;
			this.tabsSelectorEl.children[i].classList.toggle("active", active);
			this.tabs[i].setVisible(active);
		}
	}

	onResized(){
		for(const tab of this.tabs){
			tab.onResized();
		}
	}
}
