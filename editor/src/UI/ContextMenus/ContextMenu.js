import {ContextMenuItem} from "./ContextMenuItem.js";
import {ContextMenuSubmenuItem} from "./ContextMenuSubmenuItem.js";
import {Button} from "../Button.js";

/**
 * @typedef {Object} ContextMenuOptions
 * @property {ContextMenu} [parentMenu=null]
 * @property {ContextMenuStructure} [structure=null]
 */

/** @typedef {Array<ContextMenuItemOpts>} ContextMenuStructure */

/**
 * @typedef {Object} ContextMenuItemClickEvent
 * @property {ContextMenuItem} item
 * @property {function() : void} preventMenuClose
 */

/**
 * `"clamp"`: Clamp the menu to the screen.
 * `"flip"`: Moves the menu so that the corner is now on the opposite side.
 * If an element is provided, rather than a position, the menu will also be moved
 * in a way to keep the element visible.
 * @typedef {"flip" | "clamp"} ContextMenuSetPosClampMode
 */

/**
 * @typedef {"left" | "center" | "right"} ContextMenuSetPosHorizontalCorner
 * @typedef {"top" | "center" | "bottom"} ContextMenuSetPosVerticalCorner
 * @typedef {ContextMenuSetPosHorizontalCorner | ContextMenuSetPosVerticalCorner | `${ContextMenuSetPosHorizontalCorner} ${ContextMenuSetPosVerticalCorner}` | `${ContextMenuSetPosVerticalCorner} ${ContextMenuSetPosHorizontalCorner}`} ContextMenuSetPosCorner
 */

/**
 * @typedef {Object} ContextMenuItemOpts
 * @property {string} [text=""] The text to display in the item.
 * @property {function(ContextMenuItemClickEvent): void} [onClick=null] The function to call when the item is clicked.
 * @property {function(): void} [onHover=null] The function to call when the item is hovered over.
 * @property {boolean} [disabled=false] Whether the item should start disabled.
 * @property {boolean} [showRightArrow=false] Whether to arrow on the right of the text should be shown.
 * @property {boolean} [reserveIconSpace=false] If true, all items in the submenu will move to the right in case this item gets a checkmark or bullet.
 * @property {boolean} [showCheckmark=false] Whether to show a checkmark in front of to the item.
 * @property {boolean} [showBullet=false] Whether to show a bullet in front of to the item.
 * @property {string} [icon=null] The icon to show in front of the item.
 * @property {boolean} [horizontalLine=false] When true, renders a line instead of the text.
 * @property {ContextMenuStructure | (function(): Promise<ContextMenuStructure>) | function(): ContextMenuStructure} [submenu=null] The submenu structure to show on hover.
 */

export class ContextMenu {
	/**
	 * @param {import("./ContextMenuManager.js").ContextMenuManager} manager
	 * @param {ContextMenuOptions} opts
	 */
	constructor(manager, {
		parentMenu = null,
		structure = null,
	} = {}) {
		this.manager = manager;
		this.parentMenu = parentMenu;
		this.el = document.createElement("div");
		this.el.classList.add("contextMenu");
		document.body.appendChild(this.el);

		/** @type {Array<ContextMenuItem>} */
		this.addedItems = [];
		this.activeSubmenuItem = null;
		/** @type {ContextMenu} */
		this.currentSubmenu = null;
		/** @type {ContextMenuSetPosOpts} */
		this.lastPosArguments = null;

		this.hasResevedIconSpaceItem = false;

		if (structure) {
			this.createStructure(structure);
		}
	}

	destructor() {
		this.removeSubmenu();
		this.manager = null;
		for (const item of this.addedItems) {
			item.destructor();
		}
		this.addedItems = [];
		if (this.el) {
			if (this.el.parentElement) this.el.parentElement.removeChild(this.el);
			this.el = null;
		}
	}

	removeSubmenu() {
		if (this.currentSubmenu) {
			this.currentSubmenu.destructor();
			this.currentSubmenu = null;
		}
	}

	/**
	 * @typedef {Object} ContextMenuSetPosOpts
	 * @property {number} [x]
	 * @property {number} [y]
	 * @property {HTMLElement | Button | ContextMenuItem} [item]
	 * @property {ContextMenuSetPosCorner} [corner]
	 * @property {ContextMenuSetPosClampMode} [clampMode]
	 * @property {boolean} [preventElementCover] When true, will move the menu out of the way
	 * when the menu would otherwise cover the element as a result of the clamp mode. Only works
	 * with clamp mode "flip".
	 */

	/**
	 * @param  {ContextMenuSetPosOpts} options
	 */
	setPos(options) {
		this.lastPosArguments = {...options};

		let x = options.x;
		let y = options.y;
		let corner = options.corner;
		let clampMode = options.clampMode;
		let preventElementCover = options.preventElementCover;
		let el = null;

		if (options.item instanceof ContextMenuItem) {
			el = options.item.el;
			if (!clampMode) clampMode = "flip";
			if (preventElementCover == undefined) preventElementCover = true;
		}
		if (options.item instanceof Button) {
			el = options.item.el;
			if (!corner) corner = "top left";
		}
		if (el instanceof HTMLElement) {
			const rect = el.getBoundingClientRect();
			if (!corner) corner = "center";
			const corenerArgs = corner.split(" ");
			const castCornerArgs = /** @type {(ContextMenuSetPosHorizontalCorner | ContextMenuSetPosVerticalCorner)[]} */ (corenerArgs);
			/** @type {ContextMenuSetPosHorizontalCorner} */
			let horizontalCorner = "center";
			/** @type {ContextMenuSetPosVerticalCorner} */
			let verticalCorner = "center";
			if (castCornerArgs.includes("left")) horizontalCorner = "left";
			if (castCornerArgs.includes("right")) horizontalCorner = "right";
			if (castCornerArgs.includes("top")) verticalCorner = "top";
			if (castCornerArgs.includes("bottom")) verticalCorner = "bottom";

			if (horizontalCorner == "center") {
				x = rect.x + rect.width / 2;
			} else if (horizontalCorner == "left") {
				x = rect.x;
			} else if (horizontalCorner == "right") {
				x = rect.right;
			}
			if (verticalCorner == "center") {
				y = rect.y + rect.height / 2;
			} else if (verticalCorner == "top") {
				y = rect.top;
			} else if (verticalCorner == "bottom") {
				y = rect.bottom;
			}

			if (!clampMode) clampMode = "clamp";
		}

		if (!clampMode) clampMode = "flip";

		const bounds = this.el.getBoundingClientRect();
		if (clampMode == "flip") {
			if (x + bounds.width > window.innerWidth) {
				x -= bounds.width;
			}
			if (y + bounds.height > window.innerHeight) {
				y -= bounds.height;
			}
		} else if (clampMode == "clamp") {
			const deltaX = x + bounds.width - window.innerWidth;
			if (deltaX > 0) {
				x -= deltaX;
				x = Math.max(0, x);
			}
			const deltaY = y + bounds.height - window.innerHeight;
			if (deltaY > 0) {
				y -= deltaY;
				y = Math.max(0, y);
			}
		}

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

	close() {
		this.manager.onContextMenuClosed(this);
		this.destructor();
	}

	updateHasReservedIconSpaceItem() {
		this.hasResevedIconSpaceItem = this.addedItems.some(item => item.reserveIconSpace);
		for (const item of this.addedItems) {
			item.updateIconStyle();
		}
	}
}
