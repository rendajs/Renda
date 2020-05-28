import ContextMenuItem from "./ContextMenuItem.js";
import Button from "../Button.js";

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

	setPos(){
		let [x,y] = arguments;
		let [el, corner = "center"] = arguments;
		let [button, buttonCorner] = arguments;

		if(button instanceof Button){
			el = button.el;
		}
		if(el instanceof HTMLElement){
			const rect = el.getBoundingClientRect();
			const corenerArgs = corner.split(" ");
			let horizontalCorner = "center";
			let verticalCorner = "center";
			if(corenerArgs.includes("left")) horizontalCorner = "left";
			if(corenerArgs.includes("right")) horizontalCorner = "right";
			if(corenerArgs.includes("top")) verticalCorner = "top";
			if(corenerArgs.includes("bottom")) verticalCorner = "bottom";

			if(horizontalCorner == "center"){
				x = rect.x + rect.width / 2;
			}else if(horizontalCorner == "left"){
				x = rect.x;
			}else if(horizontalCorner == "right"){
				x = rect.right;
			}
			if(verticalCorner == "center"){
				y = rect.y + rect.height / 2;
			}else if(verticalCorner == "top"){
				y = rect.top;
			}else if(verticalCorner == "bottom"){
				y = rect.bottom;
			}
		}

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
