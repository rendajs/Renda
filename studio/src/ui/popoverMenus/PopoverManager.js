import {waitForEventLoop} from "../../../../src/util/util.js";
import {ContextMenu} from "./ContextMenu.js";
import {Popover} from "./Popover.js";

export class PopoverManager {
	/** @type {Popover?} */
	#activePopover = null;

	/**
	 * @param {import("../../util/colorizerFilters/ColorizerFilterManager.js").ColorizerFilterManager} colorizerFilterManager
	 */
	constructor(colorizerFilterManager) {
		this.curtainEl = document.createElement("div");
		this.curtainEl.classList.add("popover-curtain");

		const iconDefaultColorFilter = colorizerFilterManager.getFilter("var(--text-color-level0)");
		const iconHoverColorFilter = colorizerFilterManager.getFilter("var(--selected-text-color)");

		// References are kept around to ensure the filters don't get garbage collected.
		this.iconDefaultColorFilterRef = iconDefaultColorFilter.getUsageReference();
		this.iconHoverColorFilterRef = iconHoverColorFilter.getUsageReference();

		const styleBlock = document.createElement("style");
		styleBlock.textContent = `
			.contextMenuItemIcon {
				filter: url(#${iconDefaultColorFilter.getFilterId()});
			}
			.contextMenuItem:hover:not(.disabled) .contextMenuItemIcon {
				filter: url(#${iconHoverColorFilter.getFilterId()});
			}
		`;
		document.head.appendChild(styleBlock);

		this.#updateCurtainActive();
	}

	get current() {
		if (this.#activePopover && this.#activePopover.el) return this.#activePopover;
		return null;
	}

	createPopover() {
		if (this.#activePopover && this.#activePopover.el) {
			throw new Error("Cannot create a popover while one is already open.");
		}

		const popover = new Popover(this);
		this.#popoverCreated(popover);
		return popover;
	}

	/**
	 * @param {import("./ContextMenu.js").ContextMenuStructure?} structure
	 */
	createContextMenu(structure = null) {
		if (this.#activePopover && this.#activePopover.el) {
			throw new Error("Cannot create a popover while one is already open.");
		}

		const contextMenu = new ContextMenu(this, {structure});
		this.#popoverCreated(contextMenu);
		return contextMenu;
	}

	/**
	 * @param {Popover} popover
	 */
	async #popoverCreated(popover) {
		popover.onNeedsCurtainChange(this.#updateCurtainActive);
		this.#activePopover = popover;
		this.#updateCurtainActive();
		// If a popover is opened as part of clicking a button, the click event will fire on the body immediately
		// after clicking that button. This would cause the popover to immediately close again.
		// To prevent this, we run this code in the next event loop.
		await waitForEventLoop();
		this.#updateBodyClickListener();
	}

	get currentContextMenu() {
		const popover = this.current;
		if (popover instanceof ContextMenu) {
			return popover;
		}
		return null;
	}

	closeCurrent() {
		if (this.current) {
			this.current.close();
			return true;
		}
		return false;
	}

	/**
	 * @param {Popover} popover
	 */
	onPopoverClosed(popover) {
		if (popover == this.#activePopover) {
			this.#activePopover = null;
			this.#updateCurtainActive();
			this.#updateBodyClickListener();
		}
	}

	#updateBodyClickListener() {
		const needsListener = Boolean(this.current);
		if (needsListener == this.#hasBodyClickListener) return;
		if (needsListener) {
			document.body.addEventListener("click", this.#onBodyClick);
		} else {
			document.body.removeEventListener("click", this.#onBodyClick);
		}
		this.#hasBodyClickListener = needsListener;
	}

	#hasBodyClickListener = false;
	/**
	 * @param {MouseEvent} e
	 */
	#onBodyClick = e => {
		if (this.current && !this.current.el.contains(/** @type {Node} */ (e.target))) {
			this.closeCurrent();
		}
	};

	#updateCurtainActive = () => {
		if (this.current && this.current.needsCurtain) {
			document.body.appendChild(this.curtainEl);
		} else {
			this.curtainEl.remove();
		}
	};
}
