import {ContextMenu} from "./ContextMenu.js";

export class ContextMenuManager {
	/**
	 *
	 * @param {import("../../Util/ColorizerFilters/ColorizerFilterManager.js").ColorizerFilterManager} colorizerFilterManager
	 */
	constructor(colorizerFilterManager) {
		this.activeContextMenu = null;
		this.curtainEl = document.createElement("div");
		this.curtainEl.classList.add("contextMenuCurtain");
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
		if (this.activeContextMenu && this.activeContextMenu.el) return this.activeContextMenu;
		return null;
	}

	/**
	 * @param {import("./ContextMenu.js").ContextMenuStructure?} structure
	 */
	createContextMenu(structure = null) {
		if (this.activeContextMenu && this.activeContextMenu.el) {
			throw new Error("Cannot create a context menu while one is already open.");
		}

		this.activeContextMenu = new ContextMenu(this, {structure});
		this.updateCurtainActive();
		return this.activeContextMenu;
	}

	closeCurrent() {
		if (this.current) {
			this.current.close();
			return true;
		}
		return false;
	}

	/**
	 * @param {ContextMenu} contextMenu
	 */
	onContextMenuClosed(contextMenu) {
		if (contextMenu == this.activeContextMenu) {
			this.activeContextMenu = null;
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
