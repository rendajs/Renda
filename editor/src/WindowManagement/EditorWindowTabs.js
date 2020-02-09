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

		this.tabsSelectorGroup = new ButtonGroup();
		this.el.appendChild(this.tabsSelectorGroup.el);

		this.tabsEl = document.createElement("div");
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
		let prevTabCount = this.tabsSelectorGroup.buttons.length;
		let deltaCount = this.tabs.length - prevTabCount;
		if(deltaCount > 0){
			for(let i=0; i<deltaCount; i++){
				let tabIndex = prevTabCount + i;
				let newButton = new Button({
					onClick: _ => {
						this.setActiveTab(tabIndex);
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

	setActiveTab(index){
		for(let i=0; i<this.tabs.length; i++){
			let active = i == index;
			this.tabsSelectorGroup.buttons[i].setActiveHighlight(active);
			this.tabs[i].setVisible(active);
		}
	}

	onResized(){
		for(const tab of this.tabs){
			tab.onResized();
		}
	}
}
