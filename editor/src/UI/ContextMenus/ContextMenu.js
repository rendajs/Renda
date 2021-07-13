import ContextMenuItem from "./ContextMenuItem.js";
import ContextMenuSubmenuItem from "./ContextMenuSubmenuItem.js";
import Button from "../Button.js";

export default class ContextMenu{
	constructor(manager, {
		parentMenu = null,
		structure = null,
	} = {}){
		this.manager = manager;
		this.parentMenu = parentMenu;
		this.el = document.createElement("div");
		this.el.classList.add("contextMenu");
		document.body.appendChild(this.el);

		this.addedItems = [];
		this.activeSubmenuItem = null;
		this.currentSubmenu = null;
		this.lastPosArguments = null;

		if(structure){
			this.createStructure(structure);
		}
	}

	destructor(){
		this.removeSubmenu();
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

	removeSubmenu(){
		if(this.currentSubmenu){
			this.currentSubmenu.destructor();
			this.currentSubmenu = null;
		}
	}

	setPos(){
		this.lastPosArguments = Array.from(arguments);
		let [x,y, clampMode = null] = arguments;
		let [el, corner = "center", elClampMode = null] = arguments;
		let [button, buttonCorner, buttonClampMode] = arguments;
		let [contextMenuItem, contextMenuItemCorner, contextMenuClampMode] = arguments;

		if(elClampMode) clampMode = elClampMode;

		if(contextMenuItem instanceof ContextMenuItem){
			el = contextMenuItem.el;
			if(!clampMode) clampMode = "flip";
		}
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

			if(!clampMode) clampMode = "clamp";
		}

		if(!clampMode) clampMode = "flip";

		const bounds = this.el.getBoundingClientRect();
		if(clampMode == "flip"){
			if(x + bounds.width > window.innerWidth){
				x -= bounds.width;
			}
			if(y + bounds.height > window.innerHeight){
				y -= bounds.height;
			}
		}else if(clampMode == "clamp"){
			const deltaX = x + bounds.width - window.innerWidth;
			if(deltaX > 0){
				x -= deltaX;
				x = Math.max(0, x);
			}
			const deltaY = y + bounds.height - window.innerHeight;
			if(deltaY > 0){
				y -= deltaY;
				y = Math.max(0, y);
			}
		}


		this.el.style.left = x+"px";
		this.el.style.top = y+"px";
	}

	createStructure(structure){
		for(const itemSettings of structure){
			let createdItem = null;
			if(itemSettings.submenu){
				createdItem = this.addSubMenu(itemSettings.text, itemSettings);
				createdItem.onCreateSubmenu(submenu => {
					submenu.createStructure(itemSettings.submenu);
				});
			}else{
				createdItem = this.addItem(itemSettings.text, itemSettings);
			}
			if(itemSettings.cb){
				createdItem.onClick(itemSettings.cb);
			}
		}
		if(this.lastPosArguments) this.setPos(...this.lastPosArguments);
	}

	addItem(text, opts){
		let item = new ContextMenuItem(this, text, opts);
		this.addedItems.push(item);
		this.el.appendChild(item.el);
		return item;
	}

	addSubMenu(text, opts){
		const item = new ContextMenuSubmenuItem(this, text, opts);
		this.addedItems.push(item);
		this.el.appendChild(item.el);
		return item;
	}

	startHoverSubmenu(submenuItem){
		this.removeSubmenu();
		this.activeSubmenuItem = submenuItem;
		this.currentSubmenu = new ContextMenu(this.manager, {parentMenu: this});
		this.currentSubmenu.setPos(submenuItem, "top right");
		return this.currentSubmenu;
	}

	onItemClicked(){
		if(this.parentMenu){
			this.parentMenu.onItemClicked();
		}else{
			this.close();
		}
	}

	close(){
		this.manager.onContextMenuClosed(this);
		this.destructor();
	}
}
