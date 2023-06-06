import {ContextMenuItem} from "./ContextMenuItem.js";

export class ContextMenuSubmenuItem extends ContextMenuItem {
	/** @typedef {(submenu: ContextMenu) => void} OnCreateSubmenuCallback */
	/** @typedef {import("./ContextMenu.js").ContextMenu} ContextMenu */

	/**
	 * @param {ContextMenu} containingContextMenu
	 * @param {import("./ContextMenu.js").ContextMenuItemOpts} opts
	 */
	constructor(containingContextMenu, opts) {
		opts = {
			...opts,
			showRightArrow: true,
		};
		super(containingContextMenu, opts);

		/** @type {Set<OnCreateSubmenuCallback>} */
		this.onCreateSubmenuCbs = new Set();

		this.onHover(() => {
			this.createSubmenu();
		});
	}

	createSubmenu() {
		const submenu = this.containingContextMenu.startHoverSubmenu(this);
		for (const cb of this.onCreateSubmenuCbs) {
			cb(submenu);
		}
	}

	/**
	 * @param {OnCreateSubmenuCallback} cb The callback to call when the submenu is created.
	 */
	onCreateSubmenu(cb) {
		this.onCreateSubmenuCbs.add(cb);
	}
}
