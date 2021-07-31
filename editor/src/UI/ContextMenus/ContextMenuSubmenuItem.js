import ContextMenuItem from "./ContextMenuItem.js";

export default class ContextMenuSubmenuItem extends ContextMenuItem{
	/** @typedef {import("./ContextMenu.js").default} ContextMenu */
	/** @typedef {import("./ContextMenuItem").ContextMenuItemOpts} ContextMenuItemOpts */

	/**
	 * @param {ContextMenu} parentContextMenu
	 * @param {ContextMenuItemOpts} opts
	 */
	constructor(parentContextMenu, opts){
		opts = {
			...opts,
			showRightArrow: true,
		}
		super(parentContextMenu, opts);

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

	/**
	 * @param {function(ContextMenu)} cb - The callback to call when the submenu is created.
	 */
	onCreateSubmenu(cb){
		this.onCreateSubmenuCbs.add(cb);
	}
}
