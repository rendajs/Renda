import {ContextMenuItem} from "./ContextMenuItem.js";
import {ContextMenuSubmenuItem} from "./ContextMenuSubmenuItem.js";
import {Popover} from "./Popover.js";

/**
 * @typedef {object} ContextMenuOptions
 * @property {ContextMenu?} [parentMenu = null]
 * @property {ContextMenuStructure?} [structure = null]
 */

/** @typedef {Array<ContextMenuItemOpts>} ContextMenuStructure */

/**
 * @typedef {object} ContextMenuItemClickEvent
 * @property {ContextMenuItem} item
 * @property {function() : void} preventMenuClose
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
 * @property {ContextMenuStructure | (function(): Promise<ContextMenuStructure>) | function(): ContextMenuStructure} [submenu=null] The submenu structure to show on hover.
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
		super(manager);
		this.parentMenu = parentMenu;

		/** @type {Array<ContextMenuItem>} */
		this.addedItems = [];
		this.activeSubmenuItem = null;
		/** @type {ContextMenu?} */
		this.currentSubmenu = null;
		/** @type {import("./Popover.js").ContextMenuSetPosOpts?} */
		this.lastPosArguments = null;

		this.hasResevedIconSpaceItem = false;

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
	 * @param  {import("./Popover.js").ContextMenuSetPosOpts} options
	 */
		setPos(options) {
			this.lastPosArguments = {...options};
			super.setPos(options);
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
		if (this.lastPosArguments) this.setPos(this.lastPosArguments);
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
		this.currentSubmenu.setPos({
			item: submenuItem,
			corner: "top right",
		});
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
		this.hasResevedIconSpaceItem = this.addedItems.some(item => item.reserveIconSpace);
		for (const item of this.addedItems) {
			item.updateIconStyle();
		}
	}
}
