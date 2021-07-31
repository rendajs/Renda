import ContextMenu from "./ContextMenu.js";

export default class ContextMenuManager{
	constructor(){
		this.activeContextMenu = null;
		this.curtainEl = document.createElement("div");
		this.curtainEl.classList.add("contextMenuCurtain");
		this.curtainEl.addEventListener("click", () => {
			this.closeCurrent();
		});
		document.body.appendChild(this.curtainEl);
		this.updateCurtainActive();
	}

	get current(){
		if(this.activeContextMenu && this.activeContextMenu.el) return this.activeContextMenu;
		return null;
	}

	/**
	 * @param {import("./ContextMenu.js").ContextMenuStructure} structure
	 * @returns ContextMenu
	 */
	createContextMenu(structure){
		if(this.activeContextMenu && this.activeContextMenu.el) return null;

		this.activeContextMenu = new ContextMenu(this, {structure});
		this.updateCurtainActive();
		return this.activeContextMenu;
	}

	closeCurrent(){
		if(this.current){
			this.current.close();
			return true;
		}
		return false;
	}

	onContextMenuClosed(contextMenu){
		if(contextMenu == this.activeContextMenu){
			this.activeContextMenu = null;
			this.updateCurtainActive();
		}
	}

	updateCurtainActive(){
		let active = !!this.current;
		this.curtainEl.style.display = active ? null : "none";
	}
}
