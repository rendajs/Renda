import ContextMenuItem from "./ContextMenuItem.js";

export default class ContextMenu{
	constructor(manager){
		this.manager = manager;
		this.el = document.createElement("div");
		this.el.classList.add("contextMenu");
		document.body.appendChild(this.el);

		this.addedItems = [];
	}

	destructor(){
		this.manager = null;
		for(const item of this.addedItems){
			item.destructor();
		}
		this.addedItems = [];
		if(this.el){
			if(this.el.parentElement) this.el.parentElement.removeChild(this.el);
			this.el = null;
		}
	}

	setPos(x,y){
		this.el.style.left = x+"px";
		this.el.style.top = y+"px";
	}

	addItem(text, onClickCb){
		let item = new ContextMenuItem(this, text, onClickCb);
		this.addedItems.push(item);
		this.el.appendChild(item.el);
		return item;
	}

	onItemClicked(){
		this.close();
	}

	close(){
		this.manager.onContextMenuClosed(this);
		this.destructor();
	}
}
