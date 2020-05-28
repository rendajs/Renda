import ContextMenu from "./ContextMenu.js";

export default class ContextMenuManager{
	constructor(){
		this.activeContextMenu = null;
	}

	get current(){
		if(this.activeContextMenu && this.activeContextMenu.el) return this.activeContextMenu;
		return null;
	}

	createContextMenu(){
		if(this.activeContextMenu && this.activeContextMenu.el) return null;

		this.activeContextMenu = new ContextMenu();
		return this.activeContextMenu;
	}

	closeCurrent(){
		if(this.current){
			this.current.close();
			return true;
		}
		return false;
	}
}
