import {Button} from "../Button.js";
import {ContextMenuItem} from "./ContextMenuItem.js";
import {ContextMenuSubmenuItem} from "./ContextMenuSubmenuItem.js";
import {Popover} from "./Popover.js";

/**
 * @typedef {object} ContextMenuOptions
 * @property {ContextMenu?} [parentMenu = null]
 * @property {ContextMenuStructure?} [structure = null]
 */

/** @typedef {ContextMenuItemOpts[]} ContextMenuStructure */

/**
 * @typedef {object} ContextMenuItemClickEvent
 * @property {ContextMenuItem} item
 * @property {() => void} preventMenuClose
 */

/**
 * @typedef {object} ContextMenuItemOpts
 * @property {string} [text=""] The text to display in the item.
 * @property {string} [tooltip=""] The text to display when hovering over the item.
 * @property {((event: ContextMenuItemClickEvent) => any)?} [onClick = null] The function to call when the item is clicked.
 * @property {(() => void)?} [onHover=null] The function to call when the item is hovered over.
 * @property {boolean} [disabled=false] Whether the item should start disabled.
 * @property {boolean} [showRightArrow=false] Whether to arrow on the right of the text should be shown.
 * @property {boolean} [reserveIconSpace=false] If true, all items in the submenu will move to the right in case this item gets a checkmark or bullet.
 * @property {boolean} [showCheckmark=false] Whether to show a checkmark in front of to the item.
 * @property {boolean} [showBullet=false] Whether to show a bullet in front of to the item.
 * @property {string?} [icon=null] The icon to show in front of the item.
 * @property {boolean} [horizontalLine=false] When true, renders a line instead of the text.
 * @property {ContextMenuStructure | (() => Promise<ContextMenuStructure>) | ContextMenuStructure} [submenu=null] The submenu structure to show on hover.
 */

export class ContextMenu extends Popover {
	/**
	 * @param {import("./PopoverManager.js").PopoverManager} manager
	 * @param {ContextMenuOptions} opts
	 */
	constructor(manager, {
		parentMenu = null,
		structure = null,
	} = {}) {
		super(manager, {showArrow: false});
		this.parentMenu = parentMenu;

		/** @type {ContextMenuItem[]} */
		this.addedItems = [];
		this.activeSubmenuItem = null;
		/** @type {ContextMenu?} */
		this.currentSubmenu = null;
		/** @type {import("./Popover.js").PopoverSetPosItem?} */
		this.lastSetPosItem = null;

		this.hasReservedIconSpace = false;

		if (structure) {
			this.createStructure(structure);
		}
	}

	destructor() {
		super.destructor();
		this.removeSubmenu();
		for (const item of this.addedItems) {
			item.destructor();
		}
		this.addedItems = [];
	}

	removeSubmenu() {
		if (this.currentSubmenu) {
			this.currentSubmenu.destructor();
			this.currentSubmenu = null;
		}
	}

	/**
	 * @param  {import("./Popover.js").PopoverSetPosItem} item
	 */
	setPos(item) {
		this.lastSetPosItem = item;
		let x = 0;
		let y = 0;

		let el = null;
		let isSubmenu = false;
		if (item instanceof MouseEvent) {
			x = item.clientX;
			y = item.clientY;
		} else if (item instanceof ContextMenuItem) {
			el = item.el;
			isSubmenu = true;
		} else if (item instanceof Button) {
			el = item.el;
		} else {
			el = item;
		}
		let relatedElRect = null;
		if (el) {
			relatedElRect = el.getBoundingClientRect();
			if (isSubmenu) {
				x = relatedElRect.right;
				y = relatedElRect.top;
			} else {
				x = relatedElRect.x;
				y = relatedElRect.bottom;
			}
		}

		const popoverRect = this.el.getBoundingClientRect();
		if (x + popoverRect.width > window.innerWidth) {
			x -= popoverRect.width;
			if (relatedElRect) {
				if (isSubmenu) {
					x -= relatedElRect.width;
				} else {
					x += relatedElRect.width;
				}
			}
		}
		if (y + popoverRect.height > window.innerHeight) {
			y -= popoverRect.height;
			if (relatedElRect) {
				if (isSubmenu) {
					y += relatedElRect.height;
				} else {
					y -= relatedElRect.height;
				}
			}
		}
		x = Math.max(0, x);
		y = Math.max(0, y);

		this.el.style.left = x + "px";
		this.el.style.top = y + "px";
	}

	/**
	 * @param {ContextMenuStructure} structure
	 */
	createStructure(structure) {
		for (const itemSettings of structure) {
			let createdItem = null;
			if (itemSettings.submenu) {
				createdItem = this.addSubMenu(itemSettings);
				createdItem.onCreateSubmenu(submenu => {
					if (itemSettings.submenu instanceof Array) {
						submenu.createStructure(itemSettings.submenu);
					} else if (itemSettings.submenu instanceof Function) {
						const result = itemSettings.submenu();
						if (result instanceof Promise) {
							result.then(submenuStructure => {
								submenu.createStructure(submenuStructure);
							});
						} else {
							submenu.createStructure(result);
						}
					}
				});
			} else {
				createdItem = this.addItem(itemSettings);
			}
		}
		if (this.lastSetPosItem) this.setPos(this.lastSetPosItem);
	}

	/**
	 * @param {ContextMenuItemOpts} opts
	 * @returns {ContextMenuItem}
	 */
	addItem(opts) {
		const item = new ContextMenuItem(this, opts);
		this.addedItems.push(item);
		this.el.appendChild(item.el);
		this.updateHasReservedIconSpaceItem();
		return item;
	}

	/**
	 * @param {ContextMenuItemOpts} opts
	 * @returns {ContextMenuSubmenuItem}
	 */
	addSubMenu(opts) {
		const item = new ContextMenuSubmenuItem(this, opts);
		this.addedItems.push(item);
		this.el.appendChild(item.el);
		return item;
	}

	/**
	 * @param {ContextMenuSubmenuItem} submenuItem
	 * @returns {ContextMenu}
	 */
	startHoverSubmenu(submenuItem) {
		this.removeSubmenu();
		this.activeSubmenuItem = submenuItem;
		this.currentSubmenu = new ContextMenu(this.manager, {parentMenu: this});
		this.currentSubmenu.setPos(submenuItem);
		return this.currentSubmenu;
	}

	onItemClicked() {
		if (this.parentMenu) {
			this.parentMenu.onItemClicked();
		} else {
			this.close();
		}
	}

	updateHasReservedIconSpaceItem() {
		this.hasReservedIconSpace = this.addedItems.some(item => item.reserveIconSpace);
		for (const item of this.addedItems) {
			item.updateIconStyle();
		}
	}
}
