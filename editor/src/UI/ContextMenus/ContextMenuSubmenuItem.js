import ContextMenuItem from "./ContextMenuItem.js";

export default class ContextMenuSubmenuItem extends ContextMenuItem{
	/** @typedef {import("./ContextMenu.js").default} ContextMenu */

	/**
	 * @param {ContextMenu} containingContextMenu
	 * @param {import("./ContextMenu.js").ContextMenuItemOpts} opts
	 */
	constructor(containingContextMenu, opts){
		opts = {
			...opts,
			showRightArrow: true,
		}
		super(containingContextMenu, opts);

		this.onCreateSubmenuCbs = new Set();

		this.onHover(() => {
			this.createSubmenu();
		});
	}

	createSubmenu(){
		const submenu = this.containingContextMenu.startHoverSubmenu(this);
		for(const cb of this.onCreateSubmenuCbs){
			cb(submenu);
		}
	}

	/**
	 * @param {function(ContextMenu): void} cb - The callback to call when the submenu is created.
	 */
	onCreateSubmenu(cb){
		this.onCreateSubmenuCbs.add(cb);
	}
}
