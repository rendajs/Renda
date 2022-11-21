import {ContextMenuItem} from "./ContextMenuItem.js";
import {Button} from "../Button.js";
import {clamp} from "../../../../src/mod.js";

/**
 * @typedef {HTMLElement | Button | ContextMenuItem | MouseEvent} PopoverSetPosItem
 */

/**
 * @typedef PopoverOptions
 * @property {boolean} [showArrow]
 */

const ARROW_PIXELS_OFFSET_HEIGHT = 7;
const ARROW_PIXELS_WIDTH = 10;

export class Popover {
	/**
	 * @param {import("./PopoverManager.js").PopoverManager} manager
	 * @param {PopoverOptions} options
	 */
	constructor(manager, {
		showArrow = true,
	} = {}) {
		this.manager = manager;

		this.el = document.createElement("div");
		this.el.classList.add("popover");
		document.body.appendChild(this.el);

		this.arrowEl = null;
		if (showArrow) {
			const svgNs = "http://www.w3.org/2000/svg";
			this.arrowEl = document.createElementNS(svgNs, "svg");
			this.el.appendChild(this.arrowEl);
			this.arrowEl.setAttribute("width", "15");
			this.arrowEl.setAttribute("height", "8");
			this.arrowEl.setAttribute("viewBox", "0 0 15 8");
			this.arrowEl.classList.add("popover-arrow");

			const polygonNode = document.createElementNS(svgNs, "path");
			this.arrowEl.appendChild(polygonNode);
			polygonNode.setAttribute("d", "M0,8 L7.5,1 L15,8");

			const rectNode = document.createElementNS(svgNs, "rect");
			this.arrowEl.appendChild(rectNode);
			rectNode.setAttribute("x", "0");
			rectNode.setAttribute("y", "8");
			rectNode.setAttribute("width", "15");
			rectNode.setAttribute("height", "1");
		}
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

		let arrowBottom = false;
		if (y + popoverRect.height > window.innerHeight) {
			y -= popoverRect.height;
			if (relatedElRect) {
				y -= relatedElRect.height;
			}
			arrowBottom = true;
			y -= ARROW_PIXELS_OFFSET_HEIGHT;
		} else {
			y += ARROW_PIXELS_OFFSET_HEIGHT;
		}

		const originalX = x;
		x = clamp(x, 0, window.innerWidth - popoverRect.width);
		y = Math.max(0, y);

		if (this.arrowEl) {
			this.arrowEl.classList.toggle("bottom", arrowBottom);
			const xOffset = popoverRect.width / 2 + originalX - x;
			this.arrowEl.style.left = `${xOffset}px`;
		}

		this.el.style.left = x + "px";
		this.el.style.top = y + "px";
	}
}
