import ContextMenuItem from "./ContextMenuItem.js";

export default class ContextMenu{
	constructor(){
		this.el = document.createElement("div");
		this.el.classList.add("contextMenu");
		document.body.appendChild(this.el);

		this.boundOnWindowClick = this.onWindowClick.bind(this);
		window.addEventListener("click", this.boundOnWindowClick);

		this.addedItems = [];
	}

	destructor(){
		for(const item of this.addedItems){
			item.destructor();
		}
		this.addedItems = [];
		if(this.el){
			if(this.el.parentElement) this.el.parentElement.removeChild(this.el);
			this.el = null;
		}
		window.removeEventListener("click", this.boundOnWindowClick);
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

	onWindowClick(e){
		if(!this.el.contains(e.target)){
			this.close();
		}
	}

	close(){
		this.destructor();
	}
}
