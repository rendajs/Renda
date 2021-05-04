import ContextMenuItem from "./ContextMenuItem.js";

export default class ContextMenuSubmenuItem extends ContextMenuItem{
	constructor(parentContextMenu, text, opts){
		opts = {
			...opts,
			showRightArrow: true,
		}
		super(parentContextMenu, text, opts);

		this.onCreateSubmenuCbs = new Set();

		this.onHover(() => {
			this.createSubmenu();
		});
	}

	createSubmenu(){
		const submenu = this.parentContextMenu.startHoverSubmenu(this);
		for(const cb of this.onCreateSubmenuCbs){
			cb(submenu);
		}
	}

	onCreateSubmenu(cb){
		this.onCreateSubmenuCbs.add(cb);
	}
}
