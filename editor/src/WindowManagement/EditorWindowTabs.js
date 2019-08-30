import EditorWindow from "./EditorWindow.js";

export default class EditorWindowTabs extends EditorWindow{
	constructor(windowManager){
		super(windowManager);

		this.el.classList.add("editorWindowTabs");

		this.tabTypes = [];
		this.tabs = [];

		this.tabsSelectorEl = document.createElement("div");
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
		let contentWindow = new constructor();
		this.tabs[index] = contentWindow;
		this.tabsEl.appendChild(contentWindow.el);
	}
}
