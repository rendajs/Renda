import {ContextMenuItem} from "./ContextMenuItem.js";
import {Button} from "../Button.js";

/**
 * @typedef {object} ContextMenuSetPosOpts
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
 * @typedef {"left" | "center" | "right"} ContextMenuSetPosHorizontalCorner
 * @typedef {"top" | "center" | "bottom"} ContextMenuSetPosVerticalCorner
 * @typedef {ContextMenuSetPosHorizontalCorner | ContextMenuSetPosVerticalCorner | `${ContextMenuSetPosHorizontalCorner} ${ContextMenuSetPosVerticalCorner}` | `${ContextMenuSetPosVerticalCorner} ${ContextMenuSetPosHorizontalCorner}`} ContextMenuSetPosCorner
 */

/**
 * `"clamp"`: Clamp the menu to the screen.
 * `"flip"`: Moves the menu so that the corner is now on the opposite side.
 * If an element is provided, rather than a position, the menu will also be moved
 * in a way to keep the element visible.
 * @typedef {"flip" | "clamp"} ContextMenuSetPosClampMode
 */

export class Popover {
	/**
	 * @param {import("./PopoverManager.js").PopoverManager} manager
	 */
	constructor(manager) {
		this.manager = manager;

		this.el = document.createElement("div");
		this.el.classList.add("popover");
		document.body.appendChild(this.el);
	}

	destructor() {
		if (this.el) {
			if (this.el.parentElement) this.el.parentElement.removeChild(this.el);
		}
	}

	close() {
		this.manager.onPopoverClosed(this);
		this.destructor();
	}

	/**
	 * @param  {ContextMenuSetPosOpts} options
	 */
	setPos(options) {
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
		let elRect = null;
		if (el instanceof HTMLElement) {
			elRect = el.getBoundingClientRect();
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
				x = elRect.x + elRect.width / 2;
			} else if (horizontalCorner == "left") {
				x = elRect.x;
			} else if (horizontalCorner == "right") {
				x = elRect.right;
			}
			if (verticalCorner == "center") {
				y = elRect.y + elRect.height / 2;
			} else if (verticalCorner == "top") {
				y = elRect.top;
			} else if (verticalCorner == "bottom") {
				y = elRect.bottom;
			}

			if (!clampMode) clampMode = "clamp";
		}

		if (x == undefined) x = 0;
		if (y == undefined) y = 0;

		if (!clampMode) clampMode = "flip";

		const bounds = this.el.getBoundingClientRect();
		if (clampMode == "flip") {
			if (x + bounds.width > window.innerWidth) {
				x -= bounds.width;
				if (preventElementCover && elRect) {
					x -= elRect.width;
				}
			}
			if (y + bounds.height > window.innerHeight) {
				y -= bounds.height;
				if (preventElementCover && elRect) {
					y -= elRect.height;
				}
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
}
