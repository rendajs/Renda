import {ContextMenuItem} from "./ContextMenuItem.js";
import {Button} from "../Button.js";

/**
 * @typedef {HTMLElement | Button | ContextMenuItem | MouseEvent} PopoverSetPosItem
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
	 * @param  {PopoverSetPosItem} item
	 */
	setPos(item) {
		let x = 0;
		let y = 0;
		let relatedElRect;
		if (item instanceof MouseEvent) {
			x = item.clientX;
			y = item.clientY;
		} else {
			let el;
			if (item instanceof ContextMenuItem) {
				el = item.el;
			} else if (item instanceof Button) {
				el = item.el;
			} else {
				el = item;
			}

			relatedElRect = el.getBoundingClientRect();
			x = relatedElRect.x + relatedElRect.width / 2;
			y = relatedElRect.y + relatedElRect.height;
		}
		const popoverRect = this.el.getBoundingClientRect();
		x -= popoverRect.width / 2;

		if (y + popoverRect.height > window.innerHeight) {
			y -= popoverRect.height;
			if (relatedElRect) {
				y -= relatedElRect.height;
			}
		}
		x = Math.max(0, x);
		y = Math.max(0, y);

		this.el.style.left = x + "px";
		this.el.style.top = y + "px";
	}
}
