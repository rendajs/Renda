import EditorWindow from "./EditorWindow.js";

export default class EditorWindowTabs extends EditorWindow{
	constructor(windowManager){
		super(windowManager);

		this.el.classList.add("editorWindowTabs");

		this.tabTypes = [];
		this.tabs = [];

		this.tabsSelectorEl = document.createElement("div");
		this.tabsSelectorEl.classList.add("editorWindowTabSelector");
		this.el.appendChild(this.tabsSelectorEl);

		this.tabsEl = document.createElement("div");
		this.el.appendChild(this.tabsEl);
	}

	setTabType(index, tabType){
		this.tabTypes[index] = tabType;
		let constructor = this.windowManager.getContentWindowByType(tabType);
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
		let contentWindow = new constructor(this.windowManager.editor);
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
	}

	setActiveTab(index){
		for(let i=0; i<this.tabs.length; i++){
			let active = i == index;
			this.tabsSelectorEl.children[i].classList.toggle("active", active);
			this.tabs[i].setVisible(active);
		}
	}
}
