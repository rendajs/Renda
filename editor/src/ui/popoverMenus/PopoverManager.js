import {ContextMenu} from "./ContextMenu.js";
import {Popover} from "./Popover.js";

export class PopoverManager {
	/**
	 *
	 * @param {import("../../util/colorizerFilters/ColorizerFilterManager.js").ColorizerFilterManager} colorizerFilterManager
	 */
	constructor(colorizerFilterManager) {
		this.activePopover = null;
		this.curtainEl = document.createElement("div");
		this.curtainEl.classList.add("popover-curtain");
		this.curtainEl.addEventListener("click", () => {
			this.closeCurrent();
		});

		const iconDefaultColorFilter = colorizerFilterManager.getFilter("var(--default-text-color)");
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

		this.updateCurtainActive();
	}

	get current() {
		if (this.activePopover && this.activePopover.el) return this.activePopover;
		return null;
	}

	createPopover() {
		if (this.activePopover && this.activePopover.el) {
			throw new Error("Cannot create a popover while one is already open.");
		}

		this.activePopover = new Popover(this);
		this.updateCurtainActive();
		return this.activePopover;
	}

	/**
	 * @param {import("./ContextMenu.js").ContextMenuStructure?} structure
	 */
	createContextMenu(structure = null) {
		if (this.activePopover && this.activePopover.el) {
			throw new Error("Cannot create a popover while one is already open.");
		}

		const contextMenu = new ContextMenu(this, {structure});
		this.activePopover = contextMenu;
		this.updateCurtainActive();
		return contextMenu;
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
		if (popover == this.activePopover) {
			this.activePopover = null;
			this.updateCurtainActive();
		}
	}

	updateCurtainActive() {
		const active = !!this.current;
		if (active) {
			document.body.appendChild(this.curtainEl);
		} else {
			this.curtainEl.remove();
		}
	}
}
